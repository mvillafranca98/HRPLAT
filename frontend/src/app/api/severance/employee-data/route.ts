import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateVacationDaysForSeverance } from '@/lib/severanceCalculation';
import { calculateVacationEntitlement } from '@/lib/vacationBalance';

// Helper function to get last anniversary
function getLastAnniversary(startDate: Date, currentDate: Date): Date {
  const currentYear = currentDate.getFullYear();
  const startMonth = startDate.getMonth();
  const startDay = startDate.getDate();
  
  let anniversary = new Date(currentYear, startMonth, startDay);
  
  if (anniversary > currentDate) {
    anniversary = new Date(currentYear - 1, startMonth, startDay);
  }
  
  return anniversary;
}

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    
    // Check permissions (Admin or HR_Staff only)
    if (!userEmail || (userRole !== 'Admin' && userRole !== 'HR_Staff')) {
      return NextResponse.json(
        { error: 'Unauthorized. Solo personal de RRHH y Administradores pueden acceder.' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('id');

    if (!employeeId) {
      return NextResponse.json(
        { error: 'ID de empleado es requerido' },
        { status: 400 }
      );
    }

    // Fetch employee
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      include: {
        contracts: {
          orderBy: { startDate: 'desc' },
          take: 6,
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    if (!employee.startDate) {
      return NextResponse.json(
        { error: 'El empleado no tiene fecha de ingreso registrada' },
        { status: 400 }
      );
    }

    // Get current date for calculations
    const currentDate = new Date();

    // Calculate last anniversary
    const startDate = new Date(employee.startDate);
    const lastAnniversary = getLastAnniversary(startDate, currentDate);

    // Fetch approved vacation requests
    const approvedVacations = await prisma.leaveRequest.findMany({
      where: {
        userId: employee.id,
        type: 'Vacation',
        status: 'Approved',
        startDate: { lte: currentDate },
      },
      orderBy: { startDate: 'desc' },
    });

    // Calculate vacation information
    const vacationInfo = calculateVacationDaysForSeverance(
      startDate,
      currentDate,
      approvedVacations.map(v => ({
        startDate: v.startDate,
        endDate: v.endDate,
        type: v.type,
      }))
    );

    // Calculate vacation entitlement
    const vacationEntitlement = calculateVacationEntitlement(startDate, currentDate);

    // Get salary history from contracts
    // If there are contracts, use them; otherwise, use the last contract's salary for last 6 months
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    let salaryHistory: Array<{ month: string; year: number; amount: number }> = [];
    
    if (employee.contracts && employee.contracts.length > 0) {
      // Use actual contract data
      const currentSalary = employee.contracts[0].salary; // Most recent contract salary
      
      // Generate last 6 months with current salary
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(date.getMonth() - i);
        salaryHistory.push({
          month: monthNames[date.getMonth()],
          year: date.getFullYear(),
          amount: currentSalary,
        });
      }
    } else {
      // No contracts - use default/empty salary history
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(date.getMonth() - i);
        salaryHistory.push({
          month: monthNames[date.getMonth()],
          year: date.getFullYear(),
          amount: 0,
        });
      }
    }

    return NextResponse.json({
      dni: employee.dni || '',
      startDate: employee.startDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      lastAnniversaryDate: lastAnniversary.toISOString().split('T')[0],
      vacationDaysRemaining: vacationInfo.daysRemaining,
      vacationDaysEntitlement: vacationEntitlement,
      salaryHistory,
    });
  } catch (error: any) {
    console.error('Error fetching employee data for severance:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener datos del empleado',
        details: error.message,
      },
      { status: 500 }
    );
  }
}


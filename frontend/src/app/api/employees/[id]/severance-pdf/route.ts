import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSeverancePDF, getPdfFilename } from '@/lib/severancePdfGenerator';
import {
  SeveranceData,
  calculateServicePeriod,
  calculateAverageSalary,
  calculateDailySalary,
  calculateTotalDaysWorked,
  calculateVacationDaysForSeverance,
  calculateThirteenthMonth,
  calculateFourteenthMonth,
} from '@/lib/severanceCalculation';
import { getHondurasHolidaysForYear } from '@/lib/vacationBalance';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    
    // Check permissions (Admin or HR_Staff only)
    if (!userEmail || (userRole !== 'Admin' && userRole !== 'HR_Staff')) {
      return NextResponse.json(
        { error: 'Unauthorized. Solo personal de RRHH y Administradores pueden generar prestaciones.' },
        { status: 403 }
      );
    }
    
    const { terminationDate, terminationReason } = await request.json();
    
    if (!terminationDate) {
      return NextResponse.json(
        { error: 'La fecha de terminación es requerida' },
        { status: 400 }
      );
    }
    
    // Parse date correctly
    let termDate: Date;
    if (terminationDate.includes('/')) {
      const parts = terminationDate.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        termDate = new Date(year, month, day);
      } else {
        termDate = new Date(terminationDate);
      }
    } else {
      termDate = new Date(terminationDate);
    }
    
    if (isNaN(termDate.getTime())) {
      return NextResponse.json(
        { error: 'La fecha de terminación no es válida' },
        { status: 400 }
      );
    }
    
    // Fetch employee data
    const employee = await prisma.user.findUnique({
      where: { id },
      include: {
        contracts: {
          orderBy: { startDate: 'desc' },
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
        { error: 'El empleado no tiene fecha de inicio registrada' },
        { status: 400 }
      );
    }
    
    // Calculate service period
    const servicePeriod = calculateServicePeriod(
      new Date(employee.startDate),
      termDate
    );
    
    // Fetch salary history (last 6 months)
    const salaryHistory = await fetchSalaryHistory(id, termDate);
    
    // Calculate average salary
    const avgSalary = calculateAverageSalary(salaryHistory);
    const dailySalary = calculateDailySalary(avgSalary);
    
    // Fetch approved vacation requests
    const approvedVacations = await prisma.leaveRequest.findMany({
      where: {
        userId: employee.id,
        type: 'Vacation',
        status: 'Approved',
        startDate: { lte: termDate },
      },
      orderBy: { startDate: 'desc' },
    });
    
    // Calculate vacation information
    const startDate = new Date(employee.startDate);
    const vacationInfo = calculateVacationDaysForSeverance(
      startDate,
      termDate,
      approvedVacations.map(v => ({
        startDate: v.startDate,
        endDate: v.endDate,
        type: v.type,
      }))
    );
    
    // Calculate 13th and 14th month
    const thirteenthMonth = calculateThirteenthMonth(termDate);
    const fourteenthMonth = calculateFourteenthMonth(termDate);
    
    // Calculate proportional severance days (for months beyond full years)
    const proportionalSeveranceDays = (servicePeriod.months / 12) * 20; // 20 days per year
    
    // Build severance data
    const severanceData: SeveranceData = {
      employeeName: employee.name || employee.email,
      dni: employee.dni || '',
      startDate,
      terminationDate: termDate,
      terminationReason: terminationReason || 'Renuncia',
      salaryHistory: salaryHistory.map(s => ({
        month: s.month,
        year: s.year,
        amount: s.amount,
      })),
      yearsOfService: servicePeriod.years,
      monthsOfService: servicePeriod.months,
      daysOfService: servicePeriod.days,
      totalDaysWorked: calculateTotalDaysWorked(
        servicePeriod.years,
        servicePeriod.months,
        servicePeriod.days
      ),
      averageMonthlySalary: avgSalary,
      dailySalary,
      lastAnniversaryDate: vacationInfo.lastAnniversary,
      vacationDaysRemaining: vacationInfo.daysRemaining,
      vacationDaysEntitlement: vacationInfo.entitlement,
      noticeDays: 30, // Standard notice period in Honduras is 30 days
      severanceDays: 0, // Will be calculated in calculateSeveranceBenefits
      proportionalSeveranceDays,
      thirteenthMonthDays: thirteenthMonth.days,
      thirteenthMonthStartDate: thirteenthMonth.startDate,
      fourteenthMonthDays: fourteenthMonth.days,
      fourteenthMonthStartDate: fourteenthMonth.startDate,
    };
    
    // Generate PDF
    const pdfBuffer = await generateSeverancePDF(severanceData);
    
    // Get filename
    const filename = getPdfFilename(severanceData);
    
    // Return PDF file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
    
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      {
        error: 'Error al generar el PDF de prestaciones',
        details: error?.message || 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// Helper functions (same as in Excel route)
async function fetchSalaryHistory(
  userId: string,
  terminationDate: Date
): Promise<Array<{ month: string; year: number; amount: number }>> {
  const contracts = await prisma.contract.findMany({
    where: {
      userId,
      startDate: { lte: terminationDate },
      OR: [
        { endDate: null },
        { endDate: { gte: terminationDate } },
      ],
    },
    orderBy: { startDate: 'desc' },
    take: 6,
  });
  
  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  return contracts.map((contract, index) => {
    const date = new Date(terminationDate);
    date.setMonth(date.getMonth() - index);
    return {
      month: monthNames[date.getMonth()],
      year: date.getFullYear(),
      amount: contract.salary,
    };
  }).reverse();
}

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

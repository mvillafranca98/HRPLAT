import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSeveranceExcel, getTemplatePath } from '@/lib/severanceExcelGeneratorSimplified';
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
    
    // Parse date correctly - handle both ISO format (YYYY-MM-DD) and dd/mm/yyyy format
    // HTML5 date inputs send ISO format (YYYY-MM-DD), but we also handle dd/mm/yyyy for safety
    let termDate: Date;
    if (terminationDate.includes('/')) {
      // Handle dd/mm/yyyy format (day/month/year)
      const parts = terminationDate.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JavaScript
        const year = parseInt(parts[2], 10);
        termDate = new Date(year, month, day);
        console.log(`Parsed date from dd/mm/yyyy: "${terminationDate}" -> ${termDate.toISOString()} (${day}/${month + 1}/${year})`);
      } else {
        termDate = new Date(terminationDate);
      }
    } else {
      // ISO format (YYYY-MM-DD) - parse directly
      // This is what HTML5 date inputs send
      termDate = new Date(terminationDate);
      console.log(`Parsed date from ISO: "${terminationDate}" -> ${termDate.toISOString()}`);
    }
    
    // Validate the date
    if (isNaN(termDate.getTime())) {
      return NextResponse.json(
        { error: 'La fecha de terminación no es válida' },
        { status: 400 }
      );
    }
    
    // Log the final parsed date for debugging
    console.log(`Termination date parsed: ${termDate.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' })} (${termDate.getDate()}/${termDate.getMonth() + 1}/${termDate.getFullYear()})`);
    
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
    
    const startDate = new Date(employee.startDate);
    
    if (startDate > termDate) {
      return NextResponse.json(
        { error: 'La fecha de terminación debe ser posterior a la fecha de inicio' },
        { status: 400 }
      );
    }
    
    // Calculate service period
    const servicePeriod = calculateServicePeriod(startDate, termDate);
    
    // Fetch salary history from contracts (last 6 months before termination)
    const salaryHistory = await fetchSalaryHistory(employee.id, termDate);
    
    if (salaryHistory.length === 0) {
      return NextResponse.json(
        { error: 'El empleado no tiene contratos registrados. Se requiere al menos un contrato para calcular las prestaciones.' },
        { status: 400 }
      );
    }
    
    // Calculate average salary
    const averageSalary = calculateAverageSalary(salaryHistory);
    
    if (averageSalary === 0) {
      return NextResponse.json(
        { error: 'El salario promedio es cero. Verifica que los contratos tengan salarios válidos.' },
        { status: 400 }
      );
    }
    
    const dailySalary = calculateDailySalary(averageSalary);
    
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
    
    // Calculate vacation days
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
    
    // Prepare severance data
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
      averageMonthlySalary: averageSalary,
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
    
    // Get template path
    console.log('Getting template path...');
    const templatePath = getTemplatePath();
    console.log('Template path:', templatePath);
    
    // Generate Excel file
    console.log('Generating Excel file...');
    const workbook = await generateSeveranceExcel(severanceData, templatePath);
    console.log('Excel file generated successfully');
    
    // Convert to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Update employee termination status
    await prisma.user.update({
      where: { id },
      data: {
        terminationDate: termDate,
        terminationReason: terminationReason || 'Renuncia',
      },
    });
    
    // Also update contract status to Terminated
    const activeContracts = employee.contracts.filter(c => c.status === 'Active');
    for (const contract of activeContracts) {
      await prisma.contract.update({
        where: { id: contract.id },
        data: {
          status: 'Terminated',
          endDate: termDate,
        },
      });
    }
    
    // Return Excel file
    const fileName = `prestaciones_${employee.name?.replace(/\s+/g, '_') || employee.id}_${termDate.toISOString().split('T')[0]}.xlsx`;
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating severance:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    
    // Ensure we always return a valid JSON response
    const errorMessage = error?.message || 'Error desconocido al generar el documento';
    const errorDetails = {
      error: 'Error al generar el documento de prestaciones',
      details: errorMessage,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error?.stack,
        fullError: String(error),
      }),
    };
    
    return NextResponse.json(errorDetails, { status: 500 });
  }
}

/**
 * Fetch salary history for last 6 months before termination date
 */
async function fetchSalaryHistory(
  userId: string,
  terminationDate: Date
): Promise<Array<{ month: string; year: number; amount: number }>> {
  // Get all contracts for the employee
  const contracts = await prisma.contract.findMany({
    where: { userId },
    orderBy: { startDate: 'desc' },
  });
  
  if (contracts.length === 0) {
    // No contracts - return empty array (will cause error, but we'll handle it)
    return [];
  }
  
  // Get the most recent contract before termination
  const activeContract = contracts.find(
    c => c.startDate <= terminationDate && (!c.endDate || c.endDate >= terminationDate)
  ) || contracts[0]; // Fallback to most recent contract
  
  const monthlySalary = activeContract.salary;
  
  // Generate last 6 months before termination
  const salaryHistory: Array<{ month: string; year: number; amount: number }> = [];
  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(terminationDate);
    date.setMonth(date.getMonth() - i);
    
    // Check if there's a contract change in this month
    const contractForMonth = contracts.find(
      c => c.startDate <= date && (!c.endDate || c.endDate >= date)
    ) || activeContract;
    
    salaryHistory.push({
      month: monthNames[date.getMonth()],
      year: date.getFullYear(),
      amount: contractForMonth.salary,
    });
  }
  
  return salaryHistory;
}


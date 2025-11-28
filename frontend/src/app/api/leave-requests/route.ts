import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateVacationBalance, calculateBusinessDays } from '@/lib/vacationBalance';

// GET - Fetch leave requests (role-based access)
export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role');
    const userEmail = request.headers.get('x-user-email');
    
    // Employees can only see their own requests
    if (userRole === 'employee') {
      if (!userEmail) {
        return NextResponse.json(
          { error: 'Email de usuario requerido' },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      const leaveRequests = await prisma.leaveRequest.findMany({
        where: { userId: user.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              position: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return NextResponse.json(leaveRequests);
    }

    // Admin and HR_Staff can see all requests
    if (userRole === 'Admin' || userRole === 'HR_Staff') {
      const leaveRequests = await prisma.leaveRequest.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              position: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return NextResponse.json(leaveRequests);
    }

    return NextResponse.json(
      { error: 'No tienes permiso para ver solicitudes de permiso' },
      { status: 403 }
    );
  } catch (error: any) {
    console.error('Error fetching leave requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new leave request (All authenticated users)
export async function POST(request: NextRequest) {
  try {
    const userEmail = request.headers.get('x-user-email');
    
    // All authenticated users can create leave requests
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email de usuario requerido' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const { startDate, endDate, type, reason } = await request.json();

    // Validation
    if (!startDate || !endDate || !type) {
      return NextResponse.json(
        { error: 'startDate, endDate, and type are required' },
        { status: 400 }
      );
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      return NextResponse.json(
        { error: 'Fechas inválidas' },
        { status: 400 }
      );
    }

    if (parsedEndDate < parsedStartDate) {
      return NextResponse.json(
        { error: 'La fecha de fin debe ser posterior a la fecha de inicio' },
        { status: 400 }
      );
    }

    // Validate vacation requests against available balance
    if (type === 'Vacation') {
      // Get user with start date
      const userWithStartDate = await prisma.user.findUnique({
        where: { id: user.id },
        select: { startDate: true },
      });

      if (!userWithStartDate?.startDate) {
        return NextResponse.json(
          { error: 'El empleado no tiene fecha de inicio registrada. No se pueden calcular días de vacaciones.' },
          { status: 400 }
        );
      }

      // Calculate current anniversary year boundaries
      const startDate = new Date(userWithStartDate.startDate);
      const currentDate = new Date();
      const startMonth = startDate.getMonth();
      const startDay = startDate.getDate();
      const currentMonth = currentDate.getMonth();
      const currentDay = currentDate.getDate();

      let anniversaryYearStart: Date;
      let anniversaryYearEnd: Date;

      // Check if anniversary has passed this year
      if (currentMonth > startMonth || (currentMonth === startMonth && currentDay >= startDay)) {
        anniversaryYearStart = new Date(currentDate.getFullYear(), startMonth, startDay);
        anniversaryYearEnd = new Date(currentDate.getFullYear() + 1, startMonth, startDay);
        anniversaryYearEnd.setDate(anniversaryYearEnd.getDate() - 1);
      } else {
        anniversaryYearStart = new Date(currentDate.getFullYear() - 1, startMonth, startDay);
        anniversaryYearEnd = new Date(currentDate.getFullYear(), startMonth, startDay);
        anniversaryYearEnd.setDate(anniversaryYearEnd.getDate() - 1);
      }

      // Get approved vacation requests for current anniversary year
      const approvedVacations = await prisma.leaveRequest.findMany({
        where: {
          userId: user.id,
          type: 'Vacation',
          status: 'Approved',
          OR: [
            {
              startDate: {
                gte: anniversaryYearStart,
                lte: anniversaryYearEnd,
              },
            },
            {
              endDate: {
                gte: anniversaryYearStart,
                lte: anniversaryYearEnd,
              },
            },
            {
              AND: [
                { startDate: { lte: anniversaryYearStart } },
                { endDate: { gte: anniversaryYearEnd } },
              ],
            },
          ],
        },
        select: {
          startDate: true,
          endDate: true,
          type: true,
        },
      });

      // Calculate balance
      const balance = calculateVacationBalance(userWithStartDate.startDate, approvedVacations);

      // Check if employee is in trial period
      if (balance.isInTrialPeriod) {
        return NextResponse.json(
          {
            error: `El empleado aún está en período de prueba. Faltan ${balance.daysUntilEligible} días para ser elegible para vacaciones.`,
            balance,
          },
          { status: 400 }
        );
      }

      // Calculate requested days (excluding holidays)
      const requestedDays = calculateBusinessDays(parsedStartDate, parsedEndDate);

      // Validate available days
      if (requestedDays > balance.available) {
        return NextResponse.json(
          {
            error: `No tienes suficientes días de vacaciones disponibles. Disponibles: ${balance.available} días, Solicitados: ${requestedDays} días.`,
            balance,
            requestedDays,
          },
          { status: 400 }
        );
      }

    }

    // Verify prisma.leaveRequest exists
    if (!prisma.leaveRequest) {
      console.error('Prisma LeaveRequest model not available. Regenerating Prisma client...');
      // Force Prisma client regeneration
      await import('@prisma/client').then(() => {
        console.log('Prisma client imported');
      });
      throw new Error('Prisma LeaveRequest model not available. Please restart the dev server.');
    }

    // Create leave request
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId: user.id,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        type,
        reason: reason || null,
        status: 'Pending',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Solicitud de permiso creada exitosamente',
        leaveRequest,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating leave request:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message || 'Unknown error',
        code: error.code,
      },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateVacationBalance } from '@/lib/vacationBalance';

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    const searchParams = request.nextUrl.searchParams;
    const userIdParam = searchParams.get('userId');

    let targetUserId: string | null = null;

    // Employees can only see their own balance
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

      targetUserId = user.id;
    } else if (userRole === 'Admin' || userRole === 'HR_Staff') {
      // Admin/HR can view any user's balance
      if (userIdParam) {
        targetUserId = userIdParam;
      } else if (userEmail) {
        // If no userId provided, use their own
        const user = await prisma.user.findUnique({
          where: { email: userEmail },
          select: { id: true },
        });
        targetUserId = user?.id || null;
      }
    } else {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Get user with start date
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
        startDate: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (!user.startDate) {
      return NextResponse.json(
        {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          entitlement: 0,
          taken: 0,
          available: 0,
          yearsOfService: 0,
          isInTrialPeriod: false,
          daysUntilEligible: 0,
          nextAnniversary: null,
          error: 'El empleado no tiene fecha de inicio registrada',
        },
        { status: 200 }
      );
    }

    // Calculate current anniversary year boundaries
    const startDate = new Date(user.startDate);
    const currentDate = new Date();
    const startMonth = startDate.getMonth();
    const startDay = startDate.getDate();
    const currentMonth = currentDate.getMonth();
    const currentDay = currentDate.getDate();

    let anniversaryYearStart: Date;
    let anniversaryYearEnd: Date;

    // Check if anniversary has passed this year
    if (currentMonth > startMonth || (currentMonth === startMonth && currentDay >= startDay)) {
      // Anniversary already passed - current anniversary year started this year
      anniversaryYearStart = new Date(currentDate.getFullYear(), startMonth, startDay);
      anniversaryYearEnd = new Date(currentDate.getFullYear() + 1, startMonth, startDay);
      anniversaryYearEnd.setDate(anniversaryYearEnd.getDate() - 1);
    } else {
      // Anniversary hasn't passed - current anniversary year started last year
      anniversaryYearStart = new Date(currentDate.getFullYear() - 1, startMonth, startDay);
      anniversaryYearEnd = new Date(currentDate.getFullYear(), startMonth, startDay);
      anniversaryYearEnd.setDate(anniversaryYearEnd.getDate() - 1);
    }

    // Get all approved vacation requests that overlap with current anniversary year
    const approvedVacations = await prisma.leaveRequest.findMany({
      where: {
        userId: targetUserId,
        type: 'Vacation',
        status: 'Approved',
        OR: [
          {
            // Request starts within anniversary year
            startDate: {
              gte: anniversaryYearStart,
              lte: anniversaryYearEnd,
            },
          },
          {
            // Request ends within anniversary year
            endDate: {
              gte: anniversaryYearStart,
              lte: anniversaryYearEnd,
            },
          },
          {
            // Request spans entire anniversary year
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
    const balance = calculateVacationBalance(user.startDate, approvedVacations);

    return NextResponse.json({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      ...balance,
      anniversaryYearStart: anniversaryYearStart.toISOString(),
      anniversaryYearEnd: anniversaryYearEnd.toISOString(),
    });
  } catch (error: any) {
    console.error('Error calculating vacation balance:', error);
    return NextResponse.json(
      { error: 'Error al calcular el balance de vacaciones' },
      { status: 500 }
    );
  }
}


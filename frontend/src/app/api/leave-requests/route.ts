import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT - Update leave request status (approve/reject) - Admin/HR only
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userRole = request.headers.get('x-user-role');
    const userEmail = request.headers.get('x-user-email');
    
    // Only Admin and HR_Staff can approve/reject
    if (userRole !== 'Admin' && userRole !== 'HR_Staff') {
      return NextResponse.json(
        { error: 'No tienes permiso para aprobar/rechazar solicitudes' },
        { status: 403 }
      );
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email de usuario requerido' },
        { status: 400 }
      );
    }

    const { status, comments } = await request.json();

    // Validate status
    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "Approved" or "Rejected"' },
        { status: 400 }
      );
    }

    // Verify prisma.leaveRequest exists
    if (!prisma.leaveRequest) {
      console.error('Prisma LeaveRequest model not available. Regenerating Prisma client...');
      throw new Error('Prisma LeaveRequest model not available. Please restart the dev server.');
    }

    // Find leave request
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!leaveRequest) {
      return NextResponse.json(
        { error: 'Solicitud de permiso no encontrada' },
        { status: 404 }
      );
    }

    // Get reviewer info
    const reviewer = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, name: true },
    });

    if (!reviewer) {
      return NextResponse.json(
        { error: 'Revisor no encontrado' },
        { status: 404 }
      );
    }

    // Update leave request
    const updatedRequest = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        reviewedBy: reviewer.id,
        reviewedAt: new Date(),
        comments: comments || null,
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

    return NextResponse.json({
      message: `Solicitud ${status === 'Approved' ? 'aprobada' : 'rechazada'} exitosamente`,
      leaveRequest: updatedRequest,
    });
  } catch (error: any) {
    console.error('Error updating leave request:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


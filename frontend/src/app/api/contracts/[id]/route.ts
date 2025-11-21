import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET single contract
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get user role from request headers
    const userRole = request.headers.get('x-user-role');
    
    // Check if user has access (only Admin and HR_Staff)
    if (userRole !== 'Admin' && userRole !== 'HR_Staff') {
      return NextResponse.json(
        { error: 'No tienes permiso para ver contratos' },
        { status: 403 }
      );
    }

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
            startDate: true,
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json(
        { error: 'Contrato no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(contract);
  } catch (error) {
    console.error('Error fetching contract:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT/PATCH update contract
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get user role from request headers
    const userRole = request.headers.get('x-user-role');
    
    // Check if user has access (only Admin and HR_Staff)
    if (userRole !== 'Admin' && userRole !== 'HR_Staff') {
      return NextResponse.json(
        { error: 'No tienes permiso para editar contratos' },
        { status: 403 }
      );
    }

    const { salary, startDate, endDate, contractType, status, notes } = await request.json();

    // Check if contract exists
    const existingContract = await prisma.contract.findUnique({
      where: { id },
    });

    if (!existingContract) {
      return NextResponse.json(
        { error: 'Contrato no encontrado' },
        { status: 404 }
      );
    }

    // Parse dates
    const parsedStartDate = startDate ? new Date(startDate) : existingContract.startDate;
    const parsedEndDate = endDate !== undefined ? (endDate ? new Date(endDate) : null) : existingContract.endDate;

    // Update contract
    const updatedContract = await prisma.contract.update({
      where: { id },
      data: {
        salary: salary !== undefined ? parseFloat(salary) : existingContract.salary,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        contractType: contractType !== undefined ? contractType : existingContract.contractType,
        status: status || existingContract.status,
        notes: notes !== undefined ? notes : existingContract.notes,
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
      message: 'Contrato actualizado exitosamente',
      contract: updatedContract,
    });
  } catch (error: any) {
    console.error('Error updating contract:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE contract
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get user role from request headers
    const userRole = request.headers.get('x-user-role');
    
    // Check if user has access (only Admin and HR_Staff)
    if (userRole !== 'Admin' && userRole !== 'HR_Staff') {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar contratos' },
        { status: 403 }
      );
    }

    const contract = await prisma.contract.findUnique({
      where: { id },
    });

    if (!contract) {
      return NextResponse.json(
        { error: 'Contrato no encontrado' },
        { status: 404 }
      );
    }

    await prisma.contract.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Contrato eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error deleting contract:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET single employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const employee = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        dni: true,
        rtn: true,
        phoneNumber: true,
        address: true,
        startDate: true,
        position: true,
        role: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT/PATCH update employee
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, email, dni, rtn, phoneNumber, address, startDate, position } = await request.json();

    // Validation
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if employee exists
    const existingEmployee = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    // Check if email is being changed and if new email already exists
    if (email !== existingEmployee.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'Ya existe un empleado con este correo electrónico' },
          { status: 409 }
        );
      }
    }

    // Parse startDate if provided
    const parsedStartDate = startDate ? new Date(startDate) : null;

    // Update employee (don't update password)
    const updatedEmployee = await prisma.user.update({
      where: { id },
      data: {
        name: name || null,
        email,
        dni: dni || null,
        rtn: rtn || null,
        phoneNumber: phoneNumber || null,
        address: address || null,
        startDate: parsedStartDate,
        position: position || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        dni: true,
        rtn: true,
        phoneNumber: true,
        address: true,
        startDate: true,
        position: true,
        role: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: 'Empleado actualizado exitosamente',
      employee: updatedEmployee,
    });
  } catch (error: any) {
    console.error('Error updating employee:', error);
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un empleado con este correo electrónico' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE employee (optional - if you want delete functionality)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const employee = await prisma.user.findUnique({
      where: { id },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Empleado eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


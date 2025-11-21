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
    const { name, email, dni, rtn, phoneNumber, address, startDate, position, role, creatorEmail } = await request.json();

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

    // Role hierarchy levels
    const roleHierarchy: Record<string, number> = {
      Admin: 4,
      HR_Staff: 3,
      Management: 2,
      employee: 1,
    };

    function getRoleLevel(role: string): number {
      return roleHierarchy[role] || 0;
    }

    function canAssignRole(creatorRole: string | null, targetRole: string): boolean {
      if (!creatorRole) return targetRole === 'employee';
      return getRoleLevel(creatorRole) >= getRoleLevel(targetRole);
    }

    // Handle role update with permission validation
    let roleToAssign = existingEmployee.role as string;
    
    if (role) {
      // Validate role is one of the allowed values
      const allowedRoles = ['Admin', 'HR_Staff', 'Management', 'employee'];
      if (!allowedRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Rol inválido' },
          { status: 400 }
        );
      }

      // If role is being changed, validate permissions
      if (role !== existingEmployee.role) {
        if (creatorEmail) {
          const creator = await prisma.user.findUnique({
            where: { email: creatorEmail },
            select: { role: true },
          });

          if (creator) {
            const creatorRole = creator.role as string;
            // Check if creator can assign the requested role
            if (!canAssignRole(creatorRole, role)) {
              return NextResponse.json(
                { error: `No tienes permiso para asignar el rol: ${role}` },
                { status: 403 }
              );
            }
            // Check if creator can manage this employee (must have higher role)
            if (getRoleLevel(creatorRole) <= getRoleLevel(existingEmployee.role as string)) {
              return NextResponse.json(
                { error: 'No tienes permiso para modificar empleados con este rol' },
                { status: 403 }
              );
            }
          } else {
            return NextResponse.json(
              { error: 'Usuario no encontrado' },
              { status: 403 }
            );
          }
        } else {
          // No creator email provided, don't allow role changes
          return NextResponse.json(
            { error: 'Se requiere autenticación para cambiar roles' },
            { status: 403 }
          );
        }
        
        roleToAssign = role;
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
        role: roleToAssign as any, // Type assertion for Prisma enum
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


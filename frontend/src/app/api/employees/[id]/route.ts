import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRoleLevel } from '@/lib/roles';

// Helper function to check for circular references in reporting hierarchy
async function checkCircularReference(userId: string, managerId: string): Promise<boolean> {
  let currentId = managerId;
  const visited = new Set<string>([userId]);
  
  // Follow the chain of reportsTo up to 10 levels to detect cycles
  for (let i = 0; i < 10; i++) {
    if (currentId === userId) {
      return true; // Circular reference detected
    }
    
    const user = await prisma.user.findUnique({
      where: { id: currentId },
      select: { reportsToId: true },
    });
    
    if (!user || !user.reportsToId) {
      return false; // No cycle found
    }
    
    if (visited.has(user.reportsToId)) {
      return true; // Cycle detected
    }
    
    visited.add(user.reportsToId);
    currentId = user.reportsToId;
  }
  
  return false; // No cycle found within reasonable depth
}

// GET single employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get current user info from headers
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');

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
        reportsToId: true,
        reportsTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    // Check permissions: employees can only view themselves, others can view if they can edit
    if (userEmail && userRole) {
      const currentUser = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true, role: true },
      });

      if (currentUser) {
        // If viewing themselves, allow
        if (currentUser.id === id) {
          return NextResponse.json(employee);
        }

        // Otherwise, check if user can manage this employee (must have higher role)
        // Admin can view anyone
        if (currentUser.role !== 'Admin') {
          const currentUserLevel = getRoleLevel(currentUser.role as string);
          const employeeLevel = getRoleLevel(employee.role as string);

          if (currentUserLevel <= employeeLevel) {
            return NextResponse.json(
              { error: 'No tienes permiso para ver este empleado' },
              { status: 403 }
            );
          }
        }
      }
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
    const { name, email, dni, rtn, phoneNumber, address, startDate, position, role, reportsToId, creatorEmail } = await request.json();

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

    // Get current user info from headers or creatorEmail
    const userEmail = request.headers.get('x-user-email') || creatorEmail;
    const userRole = request.headers.get('x-user-role');
    
    let currentUser = null;
    if (userEmail) {
      currentUser = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true, role: true },
      });
    }

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Se requiere autenticación para editar empleados' },
        { status: 403 }
      );
    }

    // Check if user can edit this employee
    // Users can always edit themselves
    const isEditingSelf = currentUser.id === id;
    
    if (!isEditingSelf) {
      // Check if current user has higher role level than target employee
      const currentUserLevel = getRoleLevel(currentUser.role as string);
      const targetEmployeeLevel = getRoleLevel(existingEmployee.role as string);

      // Admin can edit anyone (including other Admins)
      // Others can only edit users with lower role levels
      if (currentUser.role !== 'Admin' && currentUserLevel <= targetEmployeeLevel) {
        return NextResponse.json(
          { error: 'No tienes permiso para editar empleados con este rol' },
          { status: 403 }
        );
      }
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
        // Users cannot change their own role (security measure)
        if (isEditingSelf) {
          return NextResponse.json(
            { error: 'No puedes cambiar tu propio rol' },
            { status: 403 }
          );
        }
        
        // Use currentUser we already fetched
        if (currentUser) {
          const creatorRole = currentUser.role as string;
          // Check if creator can assign the requested role
          if (!canAssignRole(creatorRole, role)) {
            return NextResponse.json(
              { error: `No tienes permiso para asignar el rol: ${role}` },
              { status: 403 }
            );
          }
          // Check if creator can manage this employee (must have higher role)
          // Admin can change roles of anyone (including other Admins)
          if (creatorRole !== 'Admin') {
            if (getRoleLevel(creatorRole) <= getRoleLevel(existingEmployee.role as string)) {
              return NextResponse.json(
                { error: 'No tienes permiso para modificar empleados con este rol' },
                { status: 403 }
              );
            }
          }
        } else {
          // No current user found, don't allow role changes
          return NextResponse.json(
            { error: 'Se requiere autenticación para cambiar roles' },
            { status: 403 }
          );
        }
        
        roleToAssign = role;
      }
    }

    // Validate reportsToId - prevent self-reference and circular references
    if (reportsToId) {
      if (reportsToId === id) {
        return NextResponse.json(
          { error: 'Un usuario no puede reportarse a sí mismo' },
          { status: 400 }
        );
      }
      
      // Check if the manager exists
      const manager = await prisma.user.findUnique({
        where: { id: reportsToId },
      });
      
      if (!manager) {
        return NextResponse.json(
          { error: 'El manager especificado no existe' },
          { status: 400 }
        );
      }
      
      // Prevent circular references (check if target user reports to current user)
      const wouldCreateCycle = await checkCircularReference(id, reportsToId);
      if (wouldCreateCycle) {
        return NextResponse.json(
          { error: 'No se puede crear una referencia circular en la jerarquía' },
          { status: 400 }
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
        role: roleToAssign as any, // Type assertion for Prisma enum
        reportsToId: reportsToId || null,
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
        reportsToId: true,
        reportsTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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


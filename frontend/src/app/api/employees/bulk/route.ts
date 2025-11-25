import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { generateRandomPassword } from '@/lib/passwordGenerator';

interface BulkEmployee {
  email: string;
  password?: string;
  name?: string;
  dni?: string;
  rtn?: string;
  phoneNumber?: string;
  address?: string;
  startDate?: string | null;
  position?: string;
  role?: string;
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
  return getRoleLevel(creatorRole) > getRoleLevel(targetRole);
}

export async function POST(request: NextRequest) {
  try {
    const { employees, creatorEmail } = await request.json();
    
    // Get creator's role if creatorEmail is provided
    let creatorRole: string | null = null;
    if (creatorEmail) {
      const creator = await prisma.user.findUnique({
        where: { email: creatorEmail },
        select: { role: true },
      });
      creatorRole = creator ? (creator.role as string) : null;
    }

    if (!Array.isArray(employees) || employees.length === 0) {
      return NextResponse.json(
        { error: 'Employees array is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Validate each employee
    const errors: Array<{ index: number; error: string }> = [];
    const employeesToCreate: BulkEmployee[] = [];

    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];

      // Required fields
      if (!employee.email) {
        errors.push({ index: i, error: 'Email is required' });
        continue;
      }

      // Generate a 6-character random password if not provided
      let password = employee.password;
      let mustChangePassword = false;
      
      if (!password || password.trim() === '') {
        password = generateRandomPassword(6);
        mustChangePassword = true;
      }

      if (password.length < 6) {
        errors.push({ index: i, error: 'Password must be at least 6 characters' });
        continue;
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: employee.email },
      });

      if (existingUser) {
        errors.push({ index: i, error: `Email ${employee.email} already exists` });
        continue;
      }

      // Determine and validate role
      let assignedRole = employee.role || 'employee';
      
      // Validate role is allowed
      const allowedRoles = ['Admin', 'HR_Staff', 'Management', 'employee'];
      if (!allowedRoles.includes(assignedRole)) {
        assignedRole = 'employee';
      }

      // Check if creator can assign the requested role
      if (employee.role && creatorRole && !canAssignRole(creatorRole, assignedRole)) {
        errors.push({ 
          index: i, 
          error: `You don't have permission to assign the role: ${assignedRole}` 
        });
        continue;
      }

      employeesToCreate.push({
        ...employee,
        password,
        role: assignedRole,
        mustChangePassword,
      });
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Validation errors occurred', 
          errors,
          message: `Failed to validate ${errors.length} employee(s)` 
        },
        { status: 400 }
      );
    }

    // Create all employees in a transaction
    const createdEmployees = [];
    const creationErrors: Array<{ index: number; email: string; error: string }> = [];

    for (let i = 0; i < employeesToCreate.length; i++) {
      const employee = employeesToCreate[i];
      try {
        // Hash password
        const hashedPassword = await bcrypt.hash(employee.password!, 10);

        // Parse startDate if provided
        const parsedStartDate = employee.startDate ? new Date(employee.startDate) : null;

        // Create employee
        const user = await prisma.user.create({
          data: {
            email: employee.email,
            password: hashedPassword,
            name: employee.name || null,
            dni: employee.dni || null,
            rtn: employee.rtn || null,
            phoneNumber: employee.phoneNumber || null,
            address: employee.address || null,
            startDate: parsedStartDate,
            position: employee.position || null,
            role: (employee.role || 'employee') as any, // Type assertion for Prisma enum
            mustChangePassword: employee.mustChangePassword || false,
          },
        });

        // Return user data without password
        const { password: _, ...userWithoutPassword } = user;
        createdEmployees.push(userWithoutPassword);
      } catch (error: any) {
        // Handle duplicate email or other database errors
        creationErrors.push({
          index: i,
          email: employee.email,
          error: error.code === 'P2002' ? 'Email already exists' : error.message || 'Unknown error',
        });
      }
    }

    // Return results
    return NextResponse.json(
      {
        message: `Successfully created ${createdEmployees.length} employee(s)`,
        created: createdEmployees,
        failed: creationErrors,
        summary: {
          total: employees.length,
          successful: createdEmployees.length,
          failed: creationErrors.length,
        },
      },
      { status: creationErrors.length === employees.length ? 500 : 201 }
    );
  } catch (error: any) {
    console.error('Bulk creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

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
}

export async function POST(request: NextRequest) {
  try {
    const { employees } = await request.json();

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

      // Generate a default password if not provided
      const password = employee.password || `TempPass${Math.random().toString(36).slice(-8)}`;

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

      employeesToCreate.push({
        ...employee,
        password,
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


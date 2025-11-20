import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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
  if (!creatorRole) return targetRole === 'employee'; // Default users can only create employees
  return getRoleLevel(creatorRole) > getRoleLevel(targetRole);
}

export async function POST(request: NextRequest) {
  try {
    const { 
      email, 
      password, 
      name, 
      dni, 
      rtn, 
      phoneNumber, 
      address, 
      startDate, 
      position,
      role,
      creatorEmail // Email of the user creating this account
    } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Determine the role to assign
    let assignedRole = role || 'employee';
    
    // If creatorEmail is provided, validate role assignment permissions
    if (creatorEmail) {
      const creator = await prisma.user.findUnique({
        where: { email: creatorEmail },
        select: { role: true },
      });

      if (creator) {
        const creatorRole = creator.role as string;
        // Check if creator can assign the requested role
        if (role && !canAssignRole(creatorRole, role)) {
          return NextResponse.json(
            { error: `You don't have permission to assign the role: ${role}` },
            { status: 403 }
          );
        }
        // If no role specified, default to employee (creator can always assign this)
        if (!role) {
          assignedRole = 'employee';
        }
      } else {
        // Creator not found, default to employee
        assignedRole = 'employee';
      }
    } else {
      // No creator, default to employee (public registration)
      assignedRole = 'employee';
    }

    // Validate role is one of the allowed values
    const allowedRoles = ['Admin', 'HR_Staff', 'Management', 'employee'];
    if (!allowedRoles.includes(assignedRole)) {
      assignedRole = 'employee';
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash the password using bcrypt (10 rounds is a good default)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Parse startDate if provided
    const parsedStartDate = startDate ? new Date(startDate) : null;

    // Create new user with hashed password
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword, // Store hashed password, NOT plain text
        name: name || null,
        dni: dni || null,
        rtn: rtn || null,
        phoneNumber: phoneNumber || null,
        address: address || null,
        startDate: parsedStartDate,
        position: position || null,
        role: assignedRole as any, // Type assertion for Prisma enum
      },
    });

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { 
        message: 'Account created successfully', 
        user: userWithoutPassword 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Handle Prisma unique constraint error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

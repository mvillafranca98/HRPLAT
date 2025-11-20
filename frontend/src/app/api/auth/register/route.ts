import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, dni, rtn, phoneNumber, address, startDate, position } = await request.json();

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
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

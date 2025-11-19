import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // TODO: Replace with actual database check
    // For now, this is a placeholder
    if (email === 'admin@hr.com' && password === 'password') {
      // In production, use JWT tokens here
      return NextResponse.json(
        { message: 'Login successful', user: { email, role: 'admin' } },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
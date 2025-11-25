import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all contracts (with role-based access)
export async function GET(request: NextRequest) {
  try {
    // Get user role and email from request headers
    const userRole = request.headers.get('x-user-role');
    const userEmail = request.headers.get('x-user-email');
    
    // Check if user has access
    if (userRole !== 'Admin' && userRole !== 'HR_Staff' && userRole !== 'employee') {
      return NextResponse.json(
        { error: 'No tienes permiso para ver contratos' },
        { status: 403 }
      );
    }

    // If employee, only get their own contract
    if (userRole === 'employee') {
      if (!userEmail) {
        return NextResponse.json(
          { error: 'Email de usuario requerido' },
          { status: 400 }
        );
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      // Get only this user's contracts
      const contracts = await prisma.contract.findMany({
        where: { userId: user.id },
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
        orderBy: {
          createdAt: 'desc',
        },
      });

      return NextResponse.json(contracts);
    }

    // Admin and HR_Staff can see all contracts
    const contracts = await prisma.contract.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(contracts);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new contract
export async function POST(request: NextRequest) {
  try {
    // Get user role from request headers
    const userRole = request.headers.get('x-user-role');
    
    // Check if user has access (only Admin and HR_Staff)
    if (userRole !== 'Admin' && userRole !== 'HR_Staff') {
      return NextResponse.json(
        { error: 'No tienes permiso para crear contratos' },
        { status: 403 }
      );
    }

    const { userId, salary, startDate, endDate, contractType, status, notes } = await request.json();

    // Validation
    if (!userId || salary === undefined || salary === null || !startDate) {
      return NextResponse.json(
        { error: 'userId, salary, and startDate are required' },
        { status: 400 }
      );
    }

    // Validate salary is a valid number
    const parsedSalary = parseFloat(salary);
    if (isNaN(parsedSalary) || parsedSalary < 0) {
      return NextResponse.json(
        { error: 'El salario debe ser un número válido mayor o igual a 0' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Parse dates
    const parsedStartDate = new Date(startDate);
    if (isNaN(parsedStartDate.getTime())) {
      return NextResponse.json(
        { error: 'Fecha de inicio inválida' },
        { status: 400 }
      );
    }

    const parsedEndDate = endDate ? new Date(endDate) : null;
    if (parsedEndDate && isNaN(parsedEndDate.getTime())) {
      return NextResponse.json(
        { error: 'Fecha de fin inválida' },
        { status: 400 }
      );
    }

    // Validate endDate is after startDate if provided
    if (parsedEndDate && parsedEndDate < parsedStartDate) {
      return NextResponse.json(
        { error: 'La fecha de fin debe ser posterior a la fecha de inicio' },
        { status: 400 }
      );
    }

    // Verify prisma.contract exists
    if (!prisma.contract) {
      console.error('Prisma Contract model not available. Regenerating Prisma client...');
      // Force Prisma client regeneration
      await import('@prisma/client').then(() => {
        console.log('Prisma client imported');
      });
      throw new Error('Prisma Contract model not available. Please restart the dev server.');
    }

    // Prepare contract data
    const contractData: any = {
      userId,
      salary: parsedSalary,
      startDate: parsedStartDate,
      status: status || 'Active',
    };

    // Only include optional fields if they have values
    if (parsedEndDate) {
      contractData.endDate = parsedEndDate;
    }
    if (contractType && contractType.trim() !== '') {
      contractData.contractType = contractType;
    }
    if (notes && notes.trim() !== '') {
      contractData.notes = notes;
    }

    // Create contract
    const contract = await prisma.contract.create({
      data: contractData,
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

    return NextResponse.json(
      {
        message: 'Contrato creado exitosamente',
        contract,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating contract:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message || 'Unknown error',
        code: error.code,
      },
      { status: 500 }
    );
  }
}


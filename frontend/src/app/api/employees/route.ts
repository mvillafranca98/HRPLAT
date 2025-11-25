import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get pagination parameters from URL search params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);
    
    // Validate pagination parameters
    const pageNumber = Math.max(1, page); // Ensure page is at least 1
    const pageSize = Math.min(Math.max(1, limit), 50); // Limit between 1-50 to prevent abuse
    
    // Calculate skip value (how many records to skip)
    const skip = (pageNumber - 1) * pageSize;

    // Get total count of employees (for calculating total pages)
    const totalCount = await prisma.user.count();

    // Get paginated employees using skip and take
    const employees = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        dni: true,
        rtn: true,
        phoneNumber: true,
        address: true,
        startDate: true,
        position: true,
        email: true,
        role: true,
        reportsToId: true,
        reportsTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc', // Most recent first
      },
      skip: skip, // Skip records from previous pages
      take: pageSize, // Take only the records for current page
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = pageNumber < totalPages;
    const hasPreviousPage = pageNumber > 1;

    return NextResponse.json({
      employees,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalCount,
        pageSize,
        hasNextPage,
        hasPreviousPage,
      },
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters from URL search params
    const searchParams = request.nextUrl.searchParams;
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    
    // Filter and search parameters
    const search = searchParams.get('search') || '';
    const roleFilter = searchParams.get('role') || 'all';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Validate pagination parameters
    const pageNumber = Math.max(1, page);
    const pageSize = Math.min(Math.max(1, limit), 50);
    
    // Calculate skip value (how many records to skip)
    const skip = (pageNumber - 1) * pageSize;

    // Build WHERE clause for filtering
    const where: any = {};
    
    // Combine search and role filter conditions
    const conditions: any[] = [];
    
    // Search filter: search in name, email, or DNI
    // Note: SQLite LIKE is case-insensitive by default for ASCII characters
    if (search.trim()) {
      conditions.push({
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { dni: { contains: search } },
        ],
      });
    }
    
    // Role filter
    if (roleFilter !== 'all') {
      conditions.push({ role: roleFilter });
    }
    
    // Combine all conditions with AND
    if (conditions.length > 0) {
      where.AND = conditions;
    }

    // Get total count of filtered employees (for calculating total pages)
    const totalCount = await prisma.user.count({ where });

    // Build orderBy clause for sorting
    let orderBy: any = {};
    
    // Map sort field to Prisma field names
    const sortFieldMap: { [key: string]: string } = {
      name: 'name',
      email: 'email',
      startDate: 'startDate',
      role: 'role',
      createdAt: 'createdAt',
    };
    
    const prismaSortField = sortFieldMap[sortBy] || 'createdAt';
    orderBy[prismaSortField] = sortOrder === 'asc' ? 'asc' : 'desc';
    
    // If sorting by name or email, add secondary sort by createdAt for consistency
    if (prismaSortField === 'name' || prismaSortField === 'email') {
      orderBy = {
        [prismaSortField]: sortOrder === 'asc' ? 'asc' : 'desc',
        createdAt: 'desc', // Secondary sort
      };
    }

    // Get paginated and filtered employees
    const employees = await prisma.user.findMany({
      where,
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
      orderBy,
      skip: skip,
      take: pageSize,
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


/**
 * API Route: List and manage user documents
 * 
 * GET /api/documents?userId={id}
 * - Returns list of all documents for a user
 * - Access control: User can see their own, HR/Admin can see anyone's
 * 
 * DELETE /api/documents/{id}
 * - Deletes a document record (does not delete from S3, but marks as inactive)
 * - Access control: User can delete their own, HR/Admin can delete anyone's
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canManageDocuments } from '@/lib/documentAccess';

// GET: List documents for a user
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from headers
    const userEmail = request.headers.get('x-user-email');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get current user from database
    const currentUser = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, role: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get target userId from query params
    const searchParams = request.nextUrl.searchParams;
    const targetUserId = searchParams.get('userId') || currentUser.id;

    // Access control: Check if user can view documents for this user
    if (!canManageDocuments(currentUser, targetUserId)) {
      return NextResponse.json(
        { error: 'You do not have permission to view these documents' },
        { status: 403 }
      );
    }

    // Get all documents for the user
    const documents = await prisma.userDocument.findMany({
      where: {
        userId: targetUserId,
        isActive: true,
      },
      orderBy: [
        { docType: 'asc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        docType: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Group documents by type for easier frontend consumption
    const grouped = {
      PROFILE: documents.filter(d => d.docType === 'PROFILE')[0] || null,
      DNI: documents.filter(d => d.docType === 'DNI')[0] || null,
      RTN: documents.filter(d => d.docType === 'RTN')[0] || null,
    };

    return NextResponse.json({
      documents,
      grouped,
      userId: targetUserId,
    });
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


/**
 * API Route: Delete a document
 * 
 * DELETE /api/documents/{id}
 * 
 * Security:
 * - Validates user authentication
 * - Enforces role-based access control (users can only delete their own unless HR/Admin)
 * - Marks document as inactive (does not delete from S3)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canManageDocuments } from '@/lib/documentAccess';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Get document ID from params
    const { id: documentId } = await params;

    // Get document with user info
    const document = await prisma.userDocument.findUnique({
      where: { id: documentId },
      include: { user: { select: { id: true } } },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Access control: Check if user can manage documents for this user
    if (!canManageDocuments(currentUser, document.userId)) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this document' },
        { status: 403 }
      );
    }

    // Mark document as inactive (soft delete)
    // Note: We don't delete from S3 here - that could be a separate cleanup job
    await prisma.userDocument.update({
      where: { id: documentId },
      data: { isActive: false },
    });

    // If it was a profile image and was active, clear the User profileImageKey
    if (document.docType === 'PROFILE' && document.isActive) {
      await prisma.user.update({
        where: { id: document.userId },
        data: { profileImageKey: null },
      });
    }

    return NextResponse.json({
      message: 'Document deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


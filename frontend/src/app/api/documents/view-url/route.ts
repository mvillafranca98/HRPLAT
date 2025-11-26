/**
 * API Route: Generate presigned URL for viewing/downloading a document
 * 
 * GET /api/documents/view-url?documentId={id}
 * GET /api/documents/view-url?userId={id}&docType={PROFILE|DNI|RTN}
 * 
 * Security:
 * - Validates user authentication
 * - Enforces role-based access control
 * - PROFILE: Any authenticated user can view
 * - DNI/RTN: Only owner, HR staff, or Admin can view
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateViewUrl } from '@/lib/s3';
import { canViewDocument } from '@/lib/documentAccess';
import { DocumentType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from headers
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');

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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get('documentId');
    const userId = searchParams.get('userId');
    const docType = searchParams.get('docType');

    let document;
    let targetUserId: string;

    // Option 1: Get by document ID
    if (documentId) {
      document = await prisma.userDocument.findUnique({
        where: { id: documentId },
        include: { user: { select: { id: true, role: true } } },
      });

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      targetUserId = document.userId;
    }
    // Option 2: Get by userId + docType (for profile images, get active one)
    else if (userId && docType) {
      const validDocTypes = ['PROFILE', 'DNI', 'RTN'];
      if (!validDocTypes.includes(docType)) {
        return NextResponse.json(
          { error: 'Invalid docType' },
          { status: 400 }
        );
      }

      // For PROFILE, get the active one; for DNI/RTN, get the most recent
      if (docType === 'PROFILE') {
        document = await prisma.userDocument.findFirst({
          where: {
            userId,
            docType: DocumentType.PROFILE,
            isActive: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        // Fallback: try User model profileImageKey if no document found
        if (!document) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { profileImageKey: true, id: true },
          });

          if (user?.profileImageKey) {
            // Create a virtual document object for profileImageKey
            return NextResponse.json({
              viewUrl: await generateViewUrl(user.profileImageKey),
              s3Key: user.profileImageKey,
              docType: 'PROFILE',
            });
          }
        }
      } else {
        document = await prisma.userDocument.findFirst({
          where: {
            userId,
            docType: docType === 'DNI' ? DocumentType.DNI : DocumentType.RTN,
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      targetUserId = userId;
    } else {
      return NextResponse.json(
        { error: 'Either documentId or (userId + docType) must be provided' },
        { status: 400 }
      );
    }

    // Access control: Check if user can view this document
    const docTypeStr = docType || (document.docType === DocumentType.PROFILE ? 'PROFILE' : document.docType === DocumentType.DNI ? 'DNI' : 'RTN');
    if (!canViewDocument(currentUser, targetUserId, docTypeStr as 'PROFILE' | 'DNI' | 'RTN')) {
      return NextResponse.json(
        { error: 'You do not have permission to view this document' },
        { status: 403 }
      );
    }

    // Generate presigned view URL
    const viewUrl = await generateViewUrl(document.s3Key);

    return NextResponse.json({
      viewUrl,
      s3Key: document.s3Key,
      docType: docTypeStr,
      fileName: document.fileName,
    });
  } catch (error: any) {
    console.error('Error generating view URL:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    if (error.message?.includes('AWS credentials not configured')) {
      errorMessage = 'S3 storage is not configured. Please contact your administrator.';
      statusCode = 503; // Service Unavailable
    } else if (error.message?.includes('Failed to initialize S3 client')) {
      errorMessage = 'S3 configuration error. Please check AWS credentials.';
      statusCode = 503;
    } else {
      errorMessage = error.message || 'Internal server error';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: statusCode }
    );
  }
}


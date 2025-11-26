/**
 * API Route: Generate presigned URL for document upload
 * 
 * POST /api/documents/upload-url
 * 
 * Body: { docType: "PROFILE" | "DNI" | "RTN", userId?: string, mimeType: string, fileName?: string, fileSize?: number }
 * 
 * Security:
 * - Validates user authentication
 * - Validates file type and size before generating URL
 * - Enforces role-based access control (users can only upload for themselves unless HR/Admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateUploadUrl, validateFile } from '@/lib/s3';
import { canUploadDocument } from '@/lib/documentAccess';
import { DocumentType } from '@prisma/client';

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { docType, userId: targetUserId, mimeType, fileName, fileSize } = body;

    // Validate required fields
    if (!docType || !mimeType) {
      return NextResponse.json(
        { error: 'docType and mimeType are required' },
        { status: 400 }
      );
    }

    // Validate docType
    const validDocTypes = ['PROFILE', 'DNI', 'RTN'];
    if (!validDocTypes.includes(docType)) {
      return NextResponse.json(
        { error: `Invalid docType. Must be one of: ${validDocTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Determine target user ID
    // If userId provided, use it (for HR/Admin uploading on behalf of others)
    // Otherwise, use current user's ID (regular user uploading for themselves)
    const userId = targetUserId || currentUser.id;

    // Validate file before generating URL
    if (fileSize !== undefined) {
      const validation = validateFile({ type: mimeType, size: fileSize });
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
    }

    // Access control: Check if user can upload this document
    if (!canUploadDocument(currentUser, userId, docType)) {
      return NextResponse.json(
        { error: 'You do not have permission to upload this document' },
        { status: 403 }
      );
    }

    // Generate presigned upload URL (do NOT create DB record yet)
    const { uploadUrl, s3Key } = await generateUploadUrl(
      userId,
      docType,
      mimeType
    );

    // Return upload URL and metadata
    // Database record will be created after successful upload via /confirm-upload endpoint
    return NextResponse.json({
      uploadUrl,
      key: s3Key,
      message: 'Upload URL generated successfully. Upload file, then call /confirm-upload to create database record.',
    });
  } catch (error: any) {
    console.error('Error generating upload URL:', error);
    
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


import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, DocumentType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Confirms that an upload was successful and creates/updates the database record.
 * This endpoint should be called AFTER a successful upload to S3.
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from headers
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, docType, s3Key, fileName, fileSize, mimeType } = body;

    if (!userId || !docType || !s3Key) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, docType, s3Key' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Role-based access control
    const canUpload = 
      userRole === 'Admin' ||
      userRole === 'HR_Staff' ||
      (userRole === 'Management' && userId === user.id) ||
      (userEmail === user.email);

    if (!canUpload) {
      return NextResponse.json(
        { error: 'Insufficient permissions to upload documents' },
        { status: 403 }
      );
    }

    // Create or update database record
    if (docType === 'PROFILE') {
      // Deactivate previous profile images
      await prisma.userDocument.updateMany({
        where: {
          userId,
          docType: DocumentType.PROFILE,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // Create new document record
      await prisma.userDocument.create({
        data: {
          userId,
          docType: DocumentType.PROFILE,
          s3Key,
          fileName: fileName || 'profile.jpg',
          fileSize: fileSize || null,
          mimeType: mimeType || null,
          isActive: true,
        },
      });

      // Also update User model profileImageKey for quick access
      await prisma.user.update({
        where: { id: userId },
        data: { profileImageKey: s3Key },
      });
    } else {
      // For DNI and RTN, create new document record
      await prisma.userDocument.create({
        data: {
          userId,
          docType: docType === 'DNI' ? DocumentType.DNI : DocumentType.RTN,
          s3Key,
          fileName: fileName || `${docType.toLowerCase()}.jpg`,
          fileSize: fileSize || null,
          mimeType: mimeType || null,
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Upload confirmed and database record created',
    });
  } catch (error: any) {
    console.error('Error confirming upload:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm upload' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}


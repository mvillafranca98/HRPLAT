/**
 * S3 Utilities for HRPLAT
 * 
 * Handles presigned URL generation for secure document uploads and downloads.
 * All AWS credentials are kept server-side only.
 * 
 * Security: No AWS credentials or bucket names in frontend code.
 * Access: All access flows through backend via presigned URLs.
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

// S3 Configuration - read from environment variables
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'hrplat-user-docs-prod';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

// Initialize S3 client (only on server-side)
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (typeof window !== 'undefined') {
    throw new Error('S3 client should only be used server-side');
  }

  if (!s3Client) {
    // Check for AWS credentials
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      const missingVars = [];
      if (!AWS_ACCESS_KEY_ID) missingVars.push('AWS_ACCESS_KEY_ID');
      if (!AWS_SECRET_ACCESS_KEY) missingVars.push('AWS_SECRET_ACCESS_KEY');
      
      throw new Error(
        `AWS credentials not configured. Missing: ${missingVars.join(', ')}. ` +
        `Please add these to your .env.local file in the frontend directory. ` +
        `Bucket: ${S3_BUCKET_NAME}, Region: ${AWS_REGION}`
      );
    }

    try {
      s3Client = new S3Client({
        region: AWS_REGION,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY,
        },
      });
    } catch (error: any) {
      throw new Error(`Failed to initialize S3 client: ${error.message}`);
    }
  }

  return s3Client;
}

/**
 * Document types supported by the system
 */
export type DocType = 'PROFILE' | 'DNI' | 'RTN';

/**
 * Generate S3 key for a document
 * Format: users/{userId}/{docType}/{uuid}.{extension}
 */
export function generateS3Key(
  userId: string,
  docType: DocType,
  fileExtension: string = 'jpg'
): string {
  const uuid = randomUUID();
  const docTypeLower = docType.toLowerCase();
  
  // For profile images, use a consistent name
  if (docType === 'PROFILE') {
    return `users/${userId}/profile/profile.${fileExtension}`;
  }
  
  return `users/${userId}/${docTypeLower}/${uuid}.${fileExtension}`;
}

/**
 * Validate file type and size
 * Only allows image/jpeg and image/png
 * Max size: 10MB
 */
export function validateFile(file: {
  type: string;
  size: number;
}): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes

  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG and PNG images are allowed.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${maxSize / 1024 / 1024}MB.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty.',
    };
  }

  return { valid: true };
}

/**
 * Get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
  };

  return mimeToExt[mimeType.toLowerCase()] || 'jpg';
}

/**
 * Generate a presigned PUT URL for uploading a document to S3
 * 
 * @param userId - User ID who owns the document
 * @param docType - Type of document (PROFILE, DNI, RTN)
 * @param mimeType - MIME type of the file (e.g., image/jpeg)
 * @param expiresIn - URL expiration time in seconds (default: 600 = 10 minutes)
 * @returns Object with uploadUrl and s3Key
 */
export async function generateUploadUrl(
  userId: string,
  docType: DocType,
  mimeType: string,
  expiresIn: number = 600 // 10 minutes default
): Promise<{ uploadUrl: string; s3Key: string }> {
  const client = getS3Client();
  const fileExtension = getFileExtension(mimeType);
  const s3Key = generateS3Key(userId, docType, fileExtension);

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: s3Key,
    ContentType: mimeType,
    // Optional: Add server-side encryption
    // ServerSideEncryption: 'AES256',
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  return {
    uploadUrl,
    s3Key,
  };
}

/**
 * Generate a presigned GET URL for viewing/downloading a document from S3
 * 
 * @param s3Key - S3 key of the document
 * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns Presigned GET URL
 */
export async function generateViewUrl(
  s3Key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  try {
    const client = getS3Client();

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
    });

    const viewUrl = await getSignedUrl(client, command, { expiresIn });

    return viewUrl;
  } catch (error: any) {
    // Re-throw with more context
    if (error.message?.includes('AWS credentials')) {
      throw error; // Already has good message
    }
    throw new Error(`Failed to generate view URL: ${error.message}`);
  }
}

/**
 * Extract user ID from S3 key
 * Format: users/{userId}/...
 */
export function extractUserIdFromS3Key(s3Key: string): string | null {
  const match = s3Key.match(/^users\/([^/]+)\//);
  return match ? match[1] : null;
}


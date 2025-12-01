# S3 Document Storage Implementation Guide

This document describes the secure S3 document storage system implemented for HRPLAT, including setup instructions and usage examples.

## 📋 Overview

The system allows users to upload and store:
- **Profile photos** (face pictures)
- **DNI/ID document images**
- **RTN/TRN document images**

All files are stored in AWS S3 using presigned URLs for secure, role-based access.

## 🔒 Security Features

- ✅ **No AWS credentials in frontend code** - All credentials are server-side only
- ✅ **Private S3 bucket** - No public access, all objects are private
- ✅ **Presigned URLs** - Short-lived URLs for uploads (10 min) and views (1 hour)
- ✅ **Role-based access control** - Profile images visible to all, DNI/RTN restricted to owner/HR/Admin
- ✅ **File validation** - Only JPEG/PNG images up to 10MB allowed

## 📦 Installation

### 1. Install Required Dependencies

```bash
cd frontend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 2. Set Environment Variables

Create or update `.env.local` in the `frontend` directory:

```env
# AWS S3 Configuration
S3_BUCKET_NAME=hrplat-user-docs-prod
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

**Important:** Never commit these credentials to version control!

### 3. Run Database Migration

Update your Prisma schema and run migrations:

```bash
cd frontend
npx prisma migrate dev --name add_user_documents
npx prisma generate
```

### 4. Create S3 Bucket

Create an S3 bucket with these settings:
- **Bucket name:** `hrplat-user-docs-prod` (or match your `S3_BUCKET_NAME`)
- **Region:** Match your `AWS_REGION`
- **Block all public access:** ✅ Enabled
- **Bucket versioning:** Optional (recommended)
- **Server-side encryption:** Optional (recommended)

### 5. Configure IAM Policy

Your AWS IAM user/role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::hrplat-user-docs-prod/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::hrplat-user-docs-prod"
    }
  ]
}
```

## 🗄️ Database Schema

### New Models

**UserDocument:**
- `id` - Unique document ID
- `userId` - User who owns the document
- `docType` - PROFILE, DNI, or RTN
- `s3Key` - S3 object key/path
- `fileName` - Original filename
- `fileSize` - File size in bytes
- `mimeType` - MIME type (e.g., image/jpeg)
- `isActive` - For soft deletes
- `createdAt`, `updatedAt` - Timestamps

**User model updated:**
- `profileImageKey` - Quick reference to active profile image S3 key

## 🔑 API Endpoints

### 1. Generate Upload URL

**POST** `/api/documents/upload-url`

Request body:
```json
{
  "docType": "PROFILE" | "DNI" | "RTN",
  "userId": "optional-user-id",  // Optional, defaults to current user
  "mimeType": "image/jpeg",
  "fileName": "profile.jpg",
  "fileSize": 123456
}
```

Response:
```json
{
  "uploadUrl": "https://s3.amazonaws.com/...",
  "key": "users/user123/profile/profile.jpg",
  "message": "Upload URL generated successfully"
}
```

### 2. Generate View URL

**GET** `/api/documents/view-url?documentId={id}`
**GET** `/api/documents/view-url?userId={id}&docType={PROFILE|DNI|RTN}`

Response:
```json
{
  "viewUrl": "https://s3.amazonaws.com/...",
  "s3Key": "users/user123/profile/profile.jpg",
  "docType": "PROFILE",
  "fileName": "profile.jpg"
}
```

### 3. List Documents

**GET** `/api/documents?userId={id}`

Response:
```json
{
  "documents": [...],
  "grouped": {
    "PROFILE": { ... },
    "DNI": { ... },
    "RTN": { ... }
  },
  "userId": "user123"
}
```

### 4. Delete Document

**DELETE** `/api/documents/{id}`

Marks document as inactive (soft delete).

## 🎨 Frontend Components

### Profile Image Upload Component

```typescript
import { useState } from 'react';

function ProfileImageUpload({ userId, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      // 1. Request upload URL from backend
      const response = await fetch('/api/documents/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': localStorage.getItem('userEmail') || '',
          'x-user-role': localStorage.getItem('userRole') || '',
        },
        body: JSON.stringify({
          docType: 'PROFILE',
          userId: userId, // Optional, defaults to current user
          mimeType: file.type,
          fileName: file.name,
          fileSize: file.size,
        }),
      });

      const { uploadUrl, key } = await response.json();

      // 2. Upload file directly to S3 using presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      // 3. Notify parent component
      onUploadComplete?.();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
```

### Profile Image Display Component

```typescript
function ProfileImage({ userId, className }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadImage() {
      try {
        const response = await fetch(
          `/api/documents/view-url?userId=${userId}&docType=PROFILE`,
          {
            headers: {
              'x-user-email': localStorage.getItem('userEmail') || '',
              'x-user-role': localStorage.getItem('userRole') || '',
            },
          }
        );

        if (response.ok) {
          const { viewUrl } = await response.json();
          setImageUrl(viewUrl);
        }
      } catch (err) {
        console.error('Error loading profile image:', err);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      loadImage();
    }
  }, [userId]);

  if (loading) {
    return <div className={className}>Loading...</div>;
  }

  if (!imageUrl) {
    return (
      <div className={className}>
        <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
          <span className="text-gray-400">No photo</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt="Profile"
      className={className}
      onError={() => setImageUrl(null)}
    />
  );
}
```

## 🔐 Access Control Rules

### Profile Images (PROFILE)
- **View:** Any authenticated user can view any user's profile image
- **Upload:** Users can upload for themselves; HR/Admin can upload for anyone

### DNI/RTN Documents
- **View:** Only the document owner, HR staff, or Admin can view
- **Upload:** Users can upload for themselves; HR/Admin can upload for anyone

## 📝 File Storage Structure

S3 key structure:
```
users/{userId}/profile/profile.jpg
users/{userId}/dni/{uuid}.jpg
users/{userId}/rtn/{uuid}.jpg
```

## 🔧 Configuration Options

### File Size Limits
Edit `/lib/s3.ts`:
```typescript
const maxSize = 10 * 1024 * 1024; // 10MB - adjust as needed
```

### Allowed File Types
Edit `/lib/s3.ts`:
```typescript
const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
// Add more types as needed
```

### URL Expiration Times
- **Upload URLs:** 10 minutes (600 seconds) - edit in `generateUploadUrl()`
- **View URLs:** 1 hour (3600 seconds) - edit in `generateViewUrl()`

## 🚀 Next Steps

1. **Install dependencies** (see Installation section)
2. **Set environment variables**
3. **Run database migrations**
4. **Create S3 bucket and configure IAM**
5. **Integrate UI components** into your pages
6. **Test upload and view flows**

## 📚 Files Created/Modified

### New Files:
- `/lib/s3.ts` - S3 utilities and presigned URL generation
- `/lib/documentAccess.ts` - Access control helpers
- `/app/api/documents/upload-url/route.ts` - Upload URL endpoint
- `/app/api/documents/view-url/route.ts` - View URL endpoint
- `/app/api/documents/route.ts` - List documents endpoint
- `/app/api/documents/[id]/route.ts` - Delete document endpoint

### Modified Files:
- `/prisma/schema.prisma` - Added UserDocument model and profileImageKey

## 🛡️ Security Notes

1. **Never expose AWS credentials** in frontend code
2. **Always validate file types and sizes** before generating presigned URLs
3. **Enforce role-based access** on all document operations
4. **Use HTTPS** for all API requests
5. **Set appropriate URL expiration times** (shorter is better)
6. **Monitor S3 bucket access logs** for suspicious activity

## ❓ Troubleshooting

### "AWS credentials not configured"
- Check that `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set in `.env.local`
- Restart your Next.js dev server after adding environment variables

### "Access Denied" errors
- Verify IAM user has proper S3 permissions
- Check bucket name matches `S3_BUCKET_NAME` environment variable
- Ensure bucket region matches `AWS_REGION`

### Upload fails
- Check file size is under 10MB
- Verify file type is JPEG or PNG
- Check presigned URL hasn't expired (10 minute window)

### Can't view documents
- Verify user authentication (email in localStorage)
- Check role-based access rules
- Ensure document exists and is active


# Quick Setup Instructions for S3 Document Storage

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd frontend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 2. Environment Variables

Add to `frontend/.env.local`:

```env
S3_BUCKET_NAME=hrplat-user-docs-prod
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-here
AWS_SECRET_ACCESS_KEY=your-secret-key-here
```

### 3. Database Migration

```bash
cd frontend
npx prisma migrate dev --name add_user_documents
npx prisma generate
```

### 4. AWS Setup

1. **Create S3 Bucket:**
   - Name: `hrplat-user-docs-prod` (or match your env var)
   - Region: Match your `AWS_REGION`
   - ✅ Block all public access
   - Optional: Enable versioning

2. **Create IAM User:**
   - Create IAM user with programmatic access
   - Attach policy (see IAM policy below)
   - Save Access Key ID and Secret Access Key

3. **IAM Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::hrplat-user-docs-prod/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::hrplat-user-docs-prod"
    }
  ]
}
```

### 5. Restart Dev Server

After adding environment variables, restart:
```bash
npm run dev
```

## Testing

1. Try uploading a profile image on the employee edit page
2. Check S3 bucket to verify file appears
3. Verify profile image displays correctly

## Files Created

All implementation files are in place. You just need to:
- Install packages
- Set environment variables
- Run migrations
- Create S3 bucket

See `S3_DOCUMENT_STORAGE_IMPLEMENTATION.md` for detailed documentation.


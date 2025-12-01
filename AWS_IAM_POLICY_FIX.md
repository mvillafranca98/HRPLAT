# Fix AWS IAM Permissions Error

## 🔴 Current Error

```
AccessDenied: User is not authorized to perform: s3:ListBucket on resource: 
arn:aws:s3:::hrplat-user-docs-prod
```

## ✅ Solution: Add IAM Policy

Your IAM user `Armando` needs S3 permissions. Here's how to fix it:

### Step 1: Go to AWS IAM Console

1. Log into AWS Console
2. Go to **IAM** → **Users**
3. Click on user **"Armando"**

### Step 2: Add S3 Permissions

**Option A: Attach AWS Managed Policy (Easiest)**
1. Click **"Add permissions"** → **"Attach policies directly"**
2. Search for **"AmazonS3FullAccess"**
3. Check the box and click **"Add permissions"**

**Option B: Create Custom Policy (More Secure - Recommended)**

1. Click **"Add permissions"** → **"Create inline policy"**
2. Click **"JSON"** tab
3. Paste this policy:

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

4. Click **"Next"**
5. Name it: `HRPLAT-S3-DocumentAccess`
6. Click **"Create policy"**

### Step 3: Verify Region

I noticed your bucket might be in `us-east-2` but your env might say `us-east-1`. 

Check your bucket region in AWS Console → S3 → `hrplat-user-docs-prod` → Properties

Update your `.env` file to match:

```env
AWS_REGION=us-east-2
```

(Or whatever region your bucket is actually in)

### Step 4: Restart Dev Server

After updating IAM permissions and region:

```bash
# Stop server (Ctrl+C)
# Restart:
cd frontend
npm run dev
```

## 🔍 Verify Setup

1. ✅ IAM user has S3 permissions
2. ✅ Bucket exists in AWS
3. ✅ Region matches in `.env`
4. ✅ Dev server restarted

## 📝 Required IAM Permissions

Minimum required:
- ✅ `s3:PutObject` - For uploads
- ✅ `s3:GetObject` - For downloads
- ✅ `s3:ListBucket` - Sometimes needed for presigned URLs
- ✅ `s3:DeleteObject` - For cleanup (optional)

All on resource: `arn:aws:s3:::hrplat-user-docs-prod/*`


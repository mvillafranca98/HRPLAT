# Fix AWS S3 Access Denied Error

## 🔴 Problem

Your IAM user `Armando` doesn't have the required S3 permissions. The error shows:
```
AccessDenied: User is not authorized to perform: s3:ListBucket
```

## ✅ Quick Fix - Add IAM Policy

### Steps:

1. **Go to AWS Console** → https://console.aws.amazon.com/

2. **Navigate to IAM:**
   - Click "Services" → Search "IAM"
   - Or go directly: https://console.aws.amazon.com/iam/

3. **Find Your User:**
   - Click "Users" in the left sidebar
   - Click on user **"Armando"**

4. **Add Permissions:**
   - Click the **"Permissions"** tab
   - Click **"Add permissions"** button
   - Select **"Attach policies directly"**
   - Search for: **"AmazonS3FullAccess"**
   - ✅ Check the box next to it
   - Click **"Next"** → **"Add permissions"**

5. **Wait 1-2 minutes** for permissions to propagate

6. **Try uploading again!**

## 🔒 Alternative: Custom Policy (More Secure)

If you prefer a more restrictive policy:

1. In IAM → Users → "Armando" → Permissions
2. Click **"Add permissions"** → **"Create inline policy"**
3. Click **"JSON"** tab
4. Paste this:

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

5. Click **"Next"**
6. Name: `HRPLAT-S3-Access`
7. Click **"Create policy"**

## 📋 Current Configuration

- ✅ Region: `us-east-2` (matches your bucket)
- ✅ Bucket: `hrplat-user-docs-prod`
- ✅ IAM User: `Armando`
- ❌ Missing: S3 permissions

## ⚠️ Important Notes

- Permissions may take 1-2 minutes to propagate
- After adding permissions, you don't need to restart the dev server
- The error should go away once permissions are added

## 🧪 Test After Adding Permissions

1. Wait 1-2 minutes
2. Try uploading a document again
3. If it still fails, check:
   - Bucket name matches exactly
   - Region matches (`us-east-2`)
   - Permissions have propagated (wait a bit longer)


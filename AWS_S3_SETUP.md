# AWS S3 Setup Guide - Fixing "Internal Server Error"

## 🔴 Current Issue

You're getting an "Internal server error" when trying to upload documents. This is because **AWS S3 credentials are not configured**.

## ✅ Quick Fix

### Step 1: Add Environment Variables

Add these lines to your `frontend/.env` or `frontend/.env.local` file:

```env
S3_BUCKET_NAME=hrplat-user-docs-prod
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id-here
AWS_SECRET_ACCESS_KEY=your-secret-key-here
```

### Step 2: Get AWS Credentials

You need to:

1. **Create an AWS Account** (if you don't have one)
   - Go to https://aws.amazon.com/
   - Sign up for an account

2. **Create an S3 Bucket:**
   - Go to AWS Console → S3
   - Click "Create bucket"
   - Name: `hrplat-user-docs-prod` (or match your env var)
   - Region: `us-east-1` (or match your env var)
   - ✅ **Block all public access** (IMPORTANT!)
   - Click "Create bucket"

3. **Create IAM User with S3 Access:**
   - Go to AWS Console → IAM → Users
   - Click "Create user"
   - Name: `hrplat-s3-user`
   - Enable "Programmatic access"
   - Attach policy: `AmazonS3FullAccess` (or create custom policy below)
   - Save the **Access Key ID** and **Secret Access Key**

4. **Custom IAM Policy (More Secure):**
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

### Step 3: Update .env File

Edit `frontend/.env` and add:

```env
S3_BUCKET_NAME=hrplat-user-docs-prod
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**Replace with your actual credentials!**

### Step 4: Restart Dev Server

After adding environment variables, **restart your Next.js dev server**:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd frontend
npm run dev
```

## 🧪 Testing Without AWS (Development Only)

If you want to test the UI without setting up AWS right now, you can temporarily modify the code to skip S3 operations. However, **this is NOT recommended for production**.

## 🔍 Verify Configuration

After adding credentials, check the error message. It should now be more specific:

- ✅ **"S3 storage is not configured"** → Credentials missing
- ✅ **"S3 configuration error"** → Invalid credentials
- ✅ **"Failed to generate upload URL"** → Bucket/region issue

## 📝 File Location

Your `.env` file should be at:
```
/Users/nestor/armando_new/HRPLAT/frontend/.env
```

Or create `.env.local` (which takes precedence):
```
/Users/nestor/armando_new/HRPLAT/frontend/.env.local
```

## ⚠️ Important Notes

1. **Never commit `.env` or `.env.local` to Git** - They're already in `.gitignore`
2. **Restart the dev server** after changing environment variables
3. **Bucket must exist** before uploading
4. **IAM user must have proper permissions**

## 🆘 Still Getting Errors?

Check the browser console and terminal for the exact error message. The improved error handling should now show:
- Which environment variable is missing
- What the configuration issue is

If you see a specific error, share it and I can help troubleshoot further!


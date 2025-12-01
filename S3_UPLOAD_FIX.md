# Fix S3 Upload "NoSuchKey" Error

## 🔴 Problem

After fixing IAM permissions, you're now getting "NoSuchKey" error. This means:
- ✅ IAM permissions are working (presigned URL was generated)
- ✅ Database record was created
- ❌ File wasn't actually uploaded to S3

## ✅ What I Fixed

I've refactored the upload flow to:
1. Generate presigned upload URL (no DB record yet)
2. Upload file to S3
3. **Only if upload succeeds**, create database record

This prevents orphaned database records pointing to non-existent files.

## 🔧 Additional Fixes Needed

### 1. Configure S3 CORS (Required!)

Your S3 bucket needs CORS configuration to allow uploads from your frontend:

1. Go to **AWS Console** → **S3** → **hrplat-user-docs-prod**
2. Click **"Permissions"** tab
3. Scroll to **"Cross-origin resource sharing (CORS)"**
4. Click **"Edit"**
5. Paste this CORS configuration:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "PUT",
            "POST",
            "DELETE",
            "HEAD"
        ],
        "AllowedOrigins": [
            "http://localhost:3000",
            "https://your-production-domain.com"
        ],
        "ExposeHeaders": [
            "ETag",
            "x-amz-server-side-encryption",
            "x-amz-request-id",
            "x-amz-id-2"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

**Important:** 
- Replace `https://your-production-domain.com` with your actual production domain
- For local development, `http://localhost:3000` is included

6. Click **"Save changes"**

### 2. Verify Upload Flow

After configuring CORS, the flow is now:

1. **Frontend requests upload URL** → `/api/documents/upload-url`
   - Returns presigned PUT URL
   - No database record created yet

2. **Frontend uploads file to S3** → Direct PUT to S3
   - If this fails, you'll see an error immediately
   - Database record is NOT created

3. **Frontend confirms upload** → `/api/documents/confirm-upload`
   - Creates database record
   - Only called if upload succeeded

### 3. Check Browser Console

After adding CORS configuration, try uploading again and check:

1. **Browser Developer Tools** → **Console** tab
2. Look for any CORS errors like:
   - `Access to fetch at '...' from origin 'http://localhost:3000' has been blocked by CORS policy`
3. **Network** tab → Check the PUT request to S3
   - Should return `200 OK` if successful
   - If `403 Forbidden` → IAM permissions issue
   - If CORS error → CORS configuration issue

### 4. Test Upload

1. Restart your dev server (after CORS config)
2. Try uploading a document
3. Check browser console for errors
4. Check Network tab for the S3 PUT request status

## 📋 Troubleshooting

### Error: "NoSuchKey" when viewing document
- **Cause:** Upload failed but database record was created (old code)
- **Fix:** Already fixed - DB record only created after successful upload

### Error: CORS policy blocked
- **Cause:** S3 bucket missing CORS configuration
- **Fix:** Add CORS config (see step 1 above)

### Error: AccessDenied on PUT
- **Cause:** IAM user missing `s3:PutObject` permission
- **Fix:** Add `AmazonS3FullAccess` policy to IAM user (already done)

### Upload succeeds but file not visible
- **Cause:** Region mismatch or bucket name typo
- **Fix:** Verify `AWS_REGION` in `.env` matches bucket region

## ✅ Summary

**What's fixed:**
- ✅ Upload flow refactored (DB record only after successful upload)
- ✅ Better error handling in upload components
- ✅ Database won't have orphaned records

**What you need to do:**
1. ⚠️ **Configure S3 CORS** (Critical - uploads will fail without this!)
2. Restart dev server
3. Try uploading again

After CORS is configured, uploads should work! 🎉


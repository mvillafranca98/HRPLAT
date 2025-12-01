# Upload Troubleshooting Guide

## 🔴 Current Issue: "NoSuchKey" Error

You're seeing "NoSuchKey" errors, which means:
- Database record exists (created successfully)
- File doesn't exist in S3 (upload failed)

## ✅ Steps to Diagnose

### Step 1: Check Browser Console

1. Open **Browser Developer Tools** (F12 or Cmd+Option+I)
2. Go to **Console** tab
3. Try uploading a document
4. Look for errors, especially:
   - CORS errors (blocked by CORS policy)
   - Network errors
   - Upload status messages (I added console.log statements)

### Step 2: Check Network Tab

1. Go to **Network** tab in Developer Tools
2. Try uploading a document
3. Look for the **PUT** request to S3 (will have a long URL with `amazonaws.com`)
4. Check the status:
   - ✅ **200 OK** = Upload succeeded
   - ❌ **0** or **CORS error** = CORS not configured
   - ❌ **403 Forbidden** = IAM permissions issue
   - ❌ **404 Not Found** = Wrong bucket/key

### Step 3: Verify S3 CORS Configuration

**CRITICAL:** If CORS is not configured, uploads will fail silently!

1. Go to **AWS Console** → **S3** → **hrplat-user-docs-prod**
2. Click **"Permissions"** tab
3. Scroll to **"Cross-origin resource sharing (CORS)"**
4. Click **"Edit"**
5. Make sure you have this configuration:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": [
            "http://localhost:3000"
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

6. Click **"Save changes"**

### Step 4: Check Upload Flow

The new upload flow works like this:

1. ✅ Request upload URL → `/api/documents/upload-url`
2. ✅ Upload file to S3 → Direct PUT request
3. ✅ Confirm upload → `/api/documents/confirm-upload` (creates DB record)

If step 2 fails, step 3 won't create a DB record (this is good - prevents orphaned records).

## 🐛 Common Issues

### Issue 1: CORS Error in Console

**Symptom:** Browser console shows "blocked by CORS policy"

**Solution:** Configure S3 CORS (see Step 3 above)

### Issue 2: Upload Shows Success but File Not Found

**Symptom:** Upload seems to work, but viewing document shows "NoSuchKey"

**Possible Causes:**
- Upload actually failed but error wasn't shown
- Old orphaned database records from before the fix
- File was deleted from S3

**Solution:**
- Check browser console for actual upload errors
- Delete and re-upload the document
- Check Network tab to see if PUT request succeeded

### Issue 3: 403 Forbidden on PUT Request

**Symptom:** Network tab shows 403 status on PUT request

**Solution:** Verify IAM user has `s3:PutObject` permission (should already be fixed)

### Issue 4: Old Orphaned Records

**Symptom:** Documents listed but can't view them (NoSuchKey)

**Solution:** The new flow prevents this, but old records might still exist. You can:
- Delete the document from the UI (if delete is implemented)
- Or manually clean up via database/API

## 📝 What I Just Fixed

1. ✅ Added console logging to track upload progress
2. ✅ Improved error messages (shows CORS errors specifically)
3. ✅ Added file existence check before opening view URL
4. ✅ Better error handling for "NoSuchKey" errors

## 🧪 Testing Steps

After configuring CORS:

1. **Restart dev server**
2. **Open browser console** (F12)
3. **Try uploading a document**
4. **Watch console for:**
   - "Uploading file to S3..."
   - "S3 Upload response: 200 OK" (success)
   - "Upload successful! Confirming with backend..."
   - "Upload confirmed and database record created successfully!"
5. **Try viewing the document** - should work now!

## 🆘 Still Not Working?

If upload still fails after CORS configuration:

1. **Check browser console** - copy all error messages
2. **Check Network tab** - screenshot the PUT request (status, headers, response)
3. **Verify S3 bucket name** in `.env` matches exactly
4. **Verify AWS region** in `.env` matches bucket region (`us-east-2`)
5. **Verify IAM permissions** are still attached to user

Share these details if you need further help!


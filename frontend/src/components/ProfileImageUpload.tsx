'use client';

import { useState, useRef, useEffect } from 'react';

interface ProfileImageUploadProps {
  userId: string;
  currentImageUrl?: string | null;
  onUploadComplete?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * ProfileImageUpload Component
 * 
 * Allows users to upload profile images using presigned S3 URLs.
 * Shows current image with upload/replace functionality.
 */
export default function ProfileImageUpload({
  userId,
  currentImageUrl,
  onUploadComplete,
  disabled = false,
  className = '',
}: ProfileImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [loadingImage, setLoadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing profile image on mount
  useEffect(() => {
    async function loadCurrentImage() {
      if (currentImageUrl || !userId) return; // If currentImageUrl is provided or no userId, skip
      
      setLoadingImage(true);
      try {
        const userEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
        const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;

        if (!userEmail) {
          setLoadingImage(false);
          return;
        }

        const response = await fetch(
          `/api/documents/view-url?userId=${userId}&docType=PROFILE`,
          {
            headers: {
              'x-user-email': userEmail,
              'x-user-role': userRole || '',
            },
          }
        );

        if (response.ok) {
          const { viewUrl } = await response.json();
          setPreviewUrl(viewUrl);
        }
      } catch (err) {
        console.error('Error loading current profile image:', err);
      } finally {
        setLoadingImage(false);
      }
    }

    loadCurrentImage();
  }, [userId, currentImageUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Create preview URL
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      // Get user email and role from localStorage
      const userEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
      const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;

      if (!userEmail) {
        throw new Error('User not authenticated');
      }

      // 1. Request upload URL from backend
      const response = await fetch('/api/documents/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
          'x-user-role': userRole || '',
        },
        body: JSON.stringify({
          docType: 'PROFILE',
          userId: userId,
          mimeType: file.type,
          fileName: file.name,
          fileSize: file.size,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get upload URL');
      }

      const { uploadUrl } = data;

      // 2. Upload file directly to S3 using presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        // Try to get error details from S3
        const errorText = await uploadResponse.text();
        console.error('S3 Upload failed:', uploadResponse.status, errorText);
        
        // Parse XML error if possible
        let errorMessage = 'Upload to S3 failed';
        if (errorText.includes('<Code>')) {
          const codeMatch = errorText.match(/<Code>(.*?)<\/Code>/);
          const messageMatch = errorText.match(/<Message>(.*?)<\/Message>/);
          if (codeMatch) errorMessage = codeMatch[1];
          if (messageMatch) errorMessage += `: ${messageMatch[1]}`;
        }
        
        throw new Error(errorMessage);
      }

      // 3. Confirm upload success and create database record
      const confirmResponse = await fetch('/api/documents/confirm-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
          'x-user-role': userRole || '',
        },
        body: JSON.stringify({
          userId: userId,
          docType: 'PROFILE',
          s3Key: data.key,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      });

      const confirmData = await confirmResponse.json();

      if (!confirmResponse.ok) {
        throw new Error(confirmData.error || 'Failed to confirm upload');
      }

      // 4. Clean up temporary preview URL
      URL.revokeObjectURL(preview);

      // 5. Fetch the actual uploaded image URL from S3
      // Wait a moment for S3 to process the upload
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        const viewResponse = await fetch(
          `/api/documents/view-url?userId=${userId}&docType=PROFILE`,
          {
            headers: {
              'x-user-email': userEmail,
              'x-user-role': userRole || '',
            },
          }
        );

        if (viewResponse.ok) {
          const { viewUrl } = await viewResponse.json();
          // Set the real S3 URL
          setPreviewUrl(viewUrl);
          console.log('Profile image updated successfully');
        } else {
          // If we can't get the view URL, try again after a delay
          console.warn('Could not fetch uploaded image URL, retrying...');
          setTimeout(async () => {
            try {
              const retryResponse = await fetch(
                `/api/documents/view-url?userId=${userId}&docType=PROFILE`,
                {
                  headers: {
                    'x-user-email': userEmail,
                    'x-user-role': userRole || '',
                  },
                }
              );
              if (retryResponse.ok) {
                const { viewUrl } = await retryResponse.json();
                setPreviewUrl(viewUrl);
              }
            } catch (err) {
              console.error('Error retrying to fetch image URL:', err);
            }
          }, 1000);
        }
      } catch (err) {
        console.error('Error fetching uploaded image URL:', err);
      }

      // Notify parent component
      onUploadComplete?.();
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      // Clean up preview URL on error
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      // Revert to current image or null
      setPreviewUrl(currentImageUrl || null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center space-x-4">
        {/* Current/Preview Image */}
        <div className="relative">
          {loadingImage ? (
            <div className="h-24 w-24 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
            </div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Profile"
              className="h-24 w-24 rounded-full object-cover border-2 border-gray-300"
              onError={() => {
                // If image fails to load, reset to no photo
                setPreviewUrl(null);
              }}
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center">
              <span className="text-gray-400 text-sm">No photo</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div>
          <label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleFileSelect}
              disabled={disabled || uploading}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {uploading ? 'Uploading...' : previewUrl ? 'Replace Photo' : 'Upload Photo'}
            </button>
          </label>
          <p className="mt-1 text-xs text-gray-500">
            JPEG or PNG, max 10MB
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600">{error}</div>
      )}
    </div>
  );
}


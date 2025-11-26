'use client';

import { useState, useEffect } from 'react';

interface ProfileImageDisplayProps {
  userId: string;
  className?: string;
  fallbackClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * ProfileImageDisplay Component
 * 
 * Displays a user's profile image using presigned S3 URLs.
 * Handles loading states and errors gracefully.
 */
export default function ProfileImageDisplay({
  userId,
  className = '',
  fallbackClassName = '',
  size = 'md',
}: ProfileImageDisplayProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-24 w-24',
    xl: 'h-32 w-32',
  };

  useEffect(() => {
    async function loadImage() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const userEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
        const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;

        if (!userEmail) {
          setLoading(false);
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
          setImageUrl(viewUrl);
        } else if (response.status === 404) {
          // No profile image found - this is OK
          setImageUrl(null);
        }
      } catch (err) {
        console.error('Error loading profile image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadImage();
  }, [userId]);

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gray-200 animate-pulse ${className}`} />
    );
  }

  if (error || !imageUrl) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center ${className} ${fallbackClassName}`}
      >
        <svg
          className="h-6 w-6 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt="Profile"
      className={`${sizeClasses[size]} rounded-full object-cover border-2 border-gray-300 ${className}`}
      onError={() => {
        setError(true);
        setImageUrl(null);
      }}
    />
  );
}


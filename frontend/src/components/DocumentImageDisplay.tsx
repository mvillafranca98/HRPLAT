'use client';

import { useState, useEffect } from 'react';

interface DocumentImageDisplayProps {
  userId: string;
  docType: 'DNI' | 'RTN';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showFullSize?: boolean; // If true, shows full-size preview in modal
}

/**
 * DocumentImageDisplay Component
 * 
 * Displays a thumbnail preview of DNI or RTN documents.
 * Clicking opens a full-size modal view.
 */
export default function DocumentImageDisplay({
  userId,
  docType,
  className = '',
  size = 'md',
  showFullSize = true,
}: DocumentImageDisplayProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const sizeClasses = {
    sm: 'h-16 w-auto max-w-xs',
    md: 'h-24 w-auto max-w-sm',
    lg: 'h-32 w-auto max-w-md',
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
          `/api/documents/view-url?userId=${userId}&docType=${docType}`,
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
          // No document found - this is OK
          setImageUrl(null);
        }
      } catch (err) {
        console.error(`Error loading ${docType} image:`, err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadImage();
  }, [userId, docType]);

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} rounded border border-gray-200 bg-gray-100 animate-pulse flex items-center justify-center ${className}`}>
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
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div
        className={`${sizeClasses[size]} rounded border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center ${className}`}
      >
        <div className="text-center p-2">
          <svg
            className="h-6 w-6 text-gray-400 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-xs text-gray-500 mt-1">No disponible</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`${sizeClasses[size]} rounded border border-gray-300 overflow-hidden cursor-pointer hover:border-indigo-500 transition-colors ${className}`}
        onClick={() => showFullSize && setShowModal(true)}
        title="Click para ver en tamaño completo"
      >
        <img
          src={imageUrl}
          alt={docType}
          className="h-full w-auto object-contain"
          onError={() => {
            setError(true);
            setImageUrl(null);
          }}
        />
      </div>

      {/* Full-size Modal */}
      {showModal && showFullSize && imageUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {docType === 'DNI' ? 'DNI' : 'RTN'} - Vista Previa
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4 flex justify-center bg-gray-50">
              <img
                src={imageUrl}
                alt={docType}
                className="max-w-full max-h-[80vh] object-contain"
                onError={() => {
                  setError(true);
                  setShowModal(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}


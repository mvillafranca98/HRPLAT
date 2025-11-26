'use client';

import { useState, useEffect } from 'react';
import ProfileImageUpload from './ProfileImageUpload';
import ProfileImageDisplay from './ProfileImageDisplay';
import DocumentImageDisplay from './DocumentImageDisplay';
import { Role } from '@/lib/roles';

interface DocumentManagementProps {
  userId: string;
  userRole: string | null;
  isEditable: boolean;
}

interface Document {
  id: string;
  docType: 'PROFILE' | 'DNI' | 'RTN';
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
}

interface DocumentsResponse {
  documents: Document[];
  grouped: {
    PROFILE: Document | null;
    DNI: Document | null;
    RTN: Document | null;
  };
}

/**
 * DocumentManagement Component
 * 
 * Displays and manages user documents (Profile, DNI, RTN).
 * Shows appropriate UI based on user role and permissions.
 */
export default function DocumentManagement({
  userId,
  userRole,
  isEditable,
}: DocumentManagementProps) {
  const [documents, setDocuments] = useState<DocumentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewUrl, setViewUrl] = useState<{ url: string; docType: string } | null>(null);

  const isHrOrAdmin = userRole === Role.Admin || userRole === Role.HR_Staff;

  useEffect(() => {
    if (userId) {
      fetchDocuments();
    }
  }, [userId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');

      const userEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
      const currentUserRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;

      if (!userEmail) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(`/api/documents?userId=${userId}`, {
        headers: {
          'x-user-email': userEmail,
          'x-user-role': currentUserRole || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load documents');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading documents');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (docType: 'DNI' | 'RTN') => {
    try {
      setError('');
      const userEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
      const currentUserRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;

      if (!userEmail) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(
        `/api/documents/view-url?userId=${userId}&docType=${docType}`,
        {
          headers: {
            'x-user-email': userEmail,
            'x-user-role': currentUserRole || '',
          },
        }
      );

      if (response.ok) {
        const { viewUrl } = await response.json();
        setViewUrl({ url: viewUrl, docType });
        
        // Open in new window directly
        // If file doesn't exist, S3 will show an error page
        window.open(viewUrl, '_blank');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to get view URL');
      }
    } catch (err: any) {
      console.error('Error viewing document:', err);
      setError(err.message || 'Error viewing document. Please check browser console for details.');
    }
  };

  const handleUploadDocument = async (
    docType: 'DNI' | 'RTN',
    file: File
  ) => {
    try {
      setError('');

      const userEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
      const currentUserRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;

      if (!userEmail) {
        setError('Not authenticated');
        return;
      }

      // Validate file
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      // 1. Get upload URL
      const urlResponse = await fetch('/api/documents/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
          'x-user-role': currentUserRole || '',
        },
        body: JSON.stringify({
          docType,
          userId: userId,
          mimeType: file.type,
          fileName: file.name,
          fileSize: file.size,
        }),
      });

      const urlData = await urlResponse.json();

      if (!urlResponse.ok) {
        throw new Error(urlData.error || 'Failed to get upload URL');
      }

      // 2. Upload to S3
      console.log('Uploading file to S3...', { 
        url: urlData.uploadUrl.substring(0, 100) + '...',
        fileSize: file.size,
        fileName: file.name 
      });
      
      const uploadResponse = await fetch(urlData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      console.log('S3 Upload response:', uploadResponse.status, uploadResponse.statusText);

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
        
        // Check for CORS errors
        if (uploadResponse.status === 0 || errorText.includes('CORS') || errorMessage.includes('CORS')) {
          errorMessage = 'Upload failed due to CORS configuration. Please ensure S3 bucket has CORS enabled. Check browser console for details.';
        }
        
        throw new Error(errorMessage);
      }

      console.log('Upload successful! Confirming with backend...');

      // 3. Confirm upload success and create database record
      const confirmResponse = await fetch('/api/documents/confirm-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
          'x-user-role': currentUserRole || '',
        },
        body: JSON.stringify({
          userId: userId,
          docType: docType,
          s3Key: urlData.key,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      });

      const confirmData = await confirmResponse.json();

      if (!confirmResponse.ok) {
        throw new Error(confirmData.error || 'Failed to confirm upload');
      }

      console.log('Upload confirmed and database record created successfully!');

      // 4. Clear any previous errors
      setError('');
      
      // 5. Refresh document list
      await fetchDocuments();
      
      // Show success message briefly
      const successMsg = `Document uploaded successfully!`;
      setError(''); // Clear any errors first
      // Note: In a real app, you'd show a green success message here
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading documents...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Profile Image Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Foto de Perfil</h3>
        {isEditable ? (
          <ProfileImageUpload
            userId={userId}
            onUploadComplete={fetchDocuments}
            disabled={!isEditable}
          />
        ) : (
          <div className="flex items-center space-x-4">
            <ProfileImageDisplay userId={userId} size="lg" />
          </div>
        )}
      </div>

      {/* DNI/RTN Documents Section - Only visible to HR/Admin or document owner */}
      {(isHrOrAdmin || isEditable) && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Documentos</h3>
          <div className="space-y-4">
            {/* DNI Document */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">DNI (Documento Nacional de Identidad)</h4>
                  {documents?.grouped.DNI ? (
                    <p className="text-sm text-gray-500 mt-1">
                      Subido el {new Date(documents.grouped.DNI.createdAt).toLocaleDateString('es-HN')}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">No subido</p>
                  )}
                  {/* Thumbnail Preview */}
                  {documents?.grouped.DNI && (
                    <div className="mt-3">
                      <DocumentImageDisplay userId={userId} docType="DNI" size="md" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col space-y-2">
                  {documents?.grouped.DNI && (
                    <button
                      onClick={() => handleViewDocument('DNI')}
                      className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 whitespace-nowrap"
                    >
                      Ver Completo
                    </button>
                  )}
                  {isEditable && (
                    <label className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 cursor-pointer whitespace-nowrap">
                      {documents?.grouped.DNI ? 'Reemplazar' : 'Subir'}
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadDocument('DNI', file);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* RTN Document */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">RTN (Registro Tributario Nacional)</h4>
                  {documents?.grouped.RTN ? (
                    <p className="text-sm text-gray-500 mt-1">
                      Subido el {new Date(documents.grouped.RTN.createdAt).toLocaleDateString('es-HN')}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">No subido</p>
                  )}
                  {/* Thumbnail Preview */}
                  {documents?.grouped.RTN && (
                    <div className="mt-3">
                      <DocumentImageDisplay userId={userId} docType="RTN" size="md" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col space-y-2">
                  {documents?.grouped.RTN && (
                    <button
                      onClick={() => handleViewDocument('RTN')}
                      className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 whitespace-nowrap"
                    >
                      Ver Completo
                    </button>
                  )}
                  {isEditable && (
                    <label className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 cursor-pointer whitespace-nowrap">
                      {documents?.grouped.RTN ? 'Reemplazar' : 'Subir'}
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadDocument('RTN', file);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


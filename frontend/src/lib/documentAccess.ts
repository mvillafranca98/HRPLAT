/**
 * Document Access Control
 * 
 * Implements role-based access control for viewing documents.
 * All access control logic is centralized here.
 */

// Import Role enum values (string literals to match Prisma enum)
const Role = {
  Admin: 'Admin',
  HR_Staff: 'HR_Staff',
  Management: 'Management',
  employee: 'employee',
} as const;

export type DocType = 'PROFILE' | 'DNI' | 'RTN';

interface User {
  id: string;
  role: Role | string;
}

/**
 * Check if a user can view a specific document
 * 
 * Rules:
 * - PROFILE: Any authenticated user can view any user's profile image
 * - DNI/RTN: Only the document owner, HR staff, or Admin can view
 * 
 * @param currentUser - Current authenticated user
 * @param targetUserId - User ID who owns the document
 * @param docType - Type of document (PROFILE, DNI, RTN)
 * @returns true if user can view the document
 */
export function canViewDocument(
  currentUser: User | null,
  targetUserId: string,
  docType: DocType
): boolean {
  if (!currentUser) {
    return false; // Must be authenticated
  }

  // Profile images: any authenticated user can view
  if (docType === 'PROFILE') {
    return true;
  }

  // DNI and RTN: restricted access
  const isOwner = currentUser.id === targetUserId;
  const isHrOrAdmin = 
    currentUser.role === Role.HR_Staff || 
    currentUser.role === Role.Admin;

  return isOwner || isHrOrAdmin;
}

/**
 * Check if a user can upload/replace a document
 * 
 * Rules:
 * - PROFILE: User can upload for themselves, HR/Admin can upload for anyone
 * - DNI/RTN: User can upload for themselves, HR/Admin can upload for anyone
 * 
 * @param currentUser - Current authenticated user
 * @param targetUserId - User ID for whom document is being uploaded
 * @param docType - Type of document (PROFILE, DNI, RTN)
 * @returns true if user can upload the document
 */
export function canUploadDocument(
  currentUser: User | null,
  targetUserId: string,
  docType: DocType
): boolean {
  if (!currentUser) {
    return false; // Must be authenticated
  }

  const isOwner = currentUser.id === targetUserId;
  const isHrOrAdmin = 
    currentUser.role === Role.HR_Staff || 
    currentUser.role === Role.Admin;

  // Users can upload for themselves, HR/Admin can upload for anyone
  return isOwner || isHrOrAdmin;
}

/**
 * Check if a user can manage (view/upload) documents for another user
 * 
 * @param currentUser - Current authenticated user
 * @param targetUserId - User ID for whom documents are being managed
 * @returns true if user can manage documents
 */
export function canManageDocuments(
  currentUser: User | null,
  targetUserId: string
): boolean {
  if (!currentUser) {
    return false;
  }

  const isOwner = currentUser.id === targetUserId;
  const isHrOrAdmin = 
    currentUser.role === Role.HR_Staff || 
    currentUser.role === Role.Admin;

  return isOwner || isHrOrAdmin;
}


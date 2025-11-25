import { Role } from './roles';

// Check if user can access contracts (Admin, HR_Staff, or employees can see their own)
export function canAccessContracts(userRole: Role | string | null): boolean {
  if (!userRole) return false;
  return userRole === Role.Admin || userRole === Role.HR_Staff || userRole === Role.employee;
}

// Check if user can view all contracts (only Admin and HR_Staff)
export function canViewAllContracts(userRole: Role | string | null): boolean {
  if (!userRole) return false;
  return userRole === Role.Admin || userRole === Role.HR_Staff;
}


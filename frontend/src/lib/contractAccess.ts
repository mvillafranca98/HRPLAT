import { Role } from './roles';

// Check if user can access contracts (only Admin and HR_Staff)
export function canAccessContracts(userRole: Role | string | null): boolean {
  if (!userRole) return false;
  return userRole === Role.Admin || userRole === Role.HR_Staff;
}


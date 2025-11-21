// Role hierarchy in order (highest to lowest)
export enum Role {
  Admin = 'Admin',
  HR_Staff = 'HR_Staff',
  Management = 'Management',
  employee = 'employee',
}

// Role hierarchy levels (higher number = higher authority)
const roleHierarchy: Record<Role, number> = {
  [Role.Admin]: 4,
  [Role.HR_Staff]: 3,
  [Role.Management]: 2,
  [Role.employee]: 1,
};

// Get role hierarchy level
export function getRoleLevel(role: Role | string): number {
  return roleHierarchy[role as Role] || 0;
}

// Check if user role has higher or equal authority than target role
export function canAccessRole(userRole: Role | string | null, targetRole: Role | string): boolean {
  if (!userRole) return false;
  return getRoleLevel(userRole) >= getRoleLevel(targetRole);
}

// Get roles that a user can assign (can only assign roles lower in hierarchy)
export function getAssignableRoles(userRole: Role | string | null): Role[] {
  if (!userRole) return [Role.employee];
  
  const userLevel = getRoleLevel(userRole);
  const allRoles = Object.values(Role);
  
  return allRoles.filter(role => getRoleLevel(role) < userLevel);
}

// Get roles that a user can assign (including same level and below)
export function getAllAssignableRoles(userRole: Role | string | null): Role[] {
  if (!userRole) return [Role.employee];
  
  const userLevel = getRoleLevel(userRole);
  const allRoles = Object.values(Role);
  
  return allRoles.filter(role => getRoleLevel(role) <= userLevel);
}

// Check if user can manage (view/edit) another user based on roles
export function canManageUser(managerRole: Role | string | null, targetRole: Role | string): boolean {
  if (!managerRole) return false;
  return getRoleLevel(managerRole) > getRoleLevel(targetRole);
}

// Check if a user can edit another user (can edit themselves or users lower in hierarchy)
export function canEditUser(editorRole: Role | string | null, editorId: string, targetRole: Role | string, targetId: string): boolean {
  if (!editorRole) return false;
  
  // Users can always edit themselves
  if (editorId === targetId) return true;
  
  // Admin can edit anyone
  if (editorRole === Role.Admin || editorRole === 'Admin') return true;
  
  // Otherwise, editor must have higher role level than target
  return getRoleLevel(editorRole) > getRoleLevel(targetRole);
}

// Get role display name
export function getRoleDisplayName(role: Role | string): string {
  const displayNames: Record<Role, string> = {
    [Role.Admin]: 'Administrador',
    [Role.HR_Staff]: 'Personal de RRHH',
    [Role.Management]: 'Gerencia',
    [Role.employee]: 'Empleado',
  };
  
  return displayNames[role as Role] || role;
}


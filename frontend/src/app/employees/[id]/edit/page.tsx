'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Role, getAssignableRoles, getRoleDisplayName, canEditUser } from '@/lib/roles';
import { canAccessContracts } from '@/lib/contractAccess';

interface Employee {
  id: string;
  name: string | null;
  email: string;
  dni: string | null;
  rtn: string | null;
  phoneNumber: string | null;
  address: string | null;
  startDate: Date | null;
  position: string | null;
  role: string;
  reportsToId: string | null;
  reportsTo: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params?.id as string;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dni: '',
    rtn: '',
    phoneNumber: '',
    address: '',
    startDate: '',
    position: '',
    role: Role.employee,
    reportsToId: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [assignableRoles, setAssignableRoles] = useState<Role[]>([]);
  const [currentEmployeeRole, setCurrentEmployeeRole] = useState<Role | null>(null);
  const [hasEditPermission, setHasEditPermission] = useState(false);
  const [availableManagers, setAvailableManagers] = useState<Employee[]>([]);

  const fetchAvailableManagers = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const allEmployees = await response.json();
        // Filter out the current employee (can't report to themselves)
        const managers = allEmployees.filter((e: Employee) => e.id !== employeeId);
        setAvailableManagers(managers);
      }
    } catch (err) {
      console.error('Error fetching managers:', err);
    }
  };

  useEffect(() => {
    // Get current user's role and email from localStorage
    if (typeof window !== 'undefined') {
      const currentUserRole = localStorage.getItem('userRole');
      const currentUserEmail = localStorage.getItem('userEmail');
      setUserRole(currentUserRole);
      setUserEmail(currentUserEmail);
    }
    
    if (employeeId) {
      fetchEmployee();
    }
  }, [employeeId]);

  const fetchEmployee = async () => {
    try {
      if (!employeeId) {
        setError('ID de empleado no válido');
        setLoading(false);
        return;
      }

      // Get current user info for permission check
      const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
      const currentUserRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;

      // Fetch employee with headers for permission check
      const headers: HeadersInit = {};
      if (currentUserEmail) headers['x-user-email'] = currentUserEmail;
      if (currentUserRole) headers['x-user-role'] = currentUserRole;

      const response = await fetch(`/api/employees/${employeeId}`, { headers });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Error al cargar la información del empleado';
        setError(errorMessage);
        
        // If permission denied, redirect after a moment
        if (response.status === 403) {
          setTimeout(() => {
            router.push('/employees');
          }, 2000);
        }
        
        setLoading(false);
        return;
      }

      const employee: Employee = await response.json();
      const employeeRole = (employee.role as Role) || Role.employee;
      setCurrentEmployeeRole(employeeRole);
      
      // Get current user's ID by fetching all employees and finding by email
      if (currentUserEmail) {
        try {
          const userResponse = await fetch('/api/employees');
          if (userResponse.ok) {
            const allUsers = await userResponse.json();
            const currentUser = allUsers.find((u: Employee) => u.email === currentUserEmail);
            if (currentUser) {
              setUserId(currentUser.id);
              // Check if current user can edit this employee
              if (currentUserRole) {
                const canEdit = canEditUser(currentUserRole, currentUser.id, employeeRole, employeeId);
                setHasEditPermission(canEdit);
                
                if (!canEdit) {
                  setError('No tienes permiso para editar este empleado');
                  setTimeout(() => {
                    router.push('/employees');
                  }, 2000);
                  setLoading(false);
                  return;
                }
              }
            }
          }
        } catch (err) {
          console.error('Error fetching current user:', err);
        }
      }
      
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        dni: employee.dni || '',
        rtn: employee.rtn || '',
        phoneNumber: employee.phoneNumber || '',
        address: employee.address || '',
        startDate: employee.startDate 
          ? new Date(employee.startDate).toISOString().split('T')[0]
          : '',
        position: employee.position || '',
        role: employeeRole,
        reportsToId: employee.reportsToId || '',
      });
      
      // Fetch available managers (only if Admin or HR_Staff)
      if (currentUserRole === 'Admin' || currentUserRole === 'HR_Staff') {
        fetchAvailableManagers();
      }
      
      // Update assignable roles to include current employee role if not already included
      if (currentUserRole) {
        const assignable = getAssignableRoles(currentUserRole);
        // Include current employee role in the list so it can be displayed
        const rolesToShow = [...new Set([...assignable, employeeRole])];
        setAssignableRoles(rolesToShow);
      }
    } catch (err) {
      console.error('Error fetching employee:', err);
      setError('Error al cargar la información del empleado. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (!employeeId) {
        setError('ID de empleado no válido');
        setSaving(false);
        return;
      }

      const creatorEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
      const creatorRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (creatorEmail) {
        headers['x-user-email'] = creatorEmail;
      }
      if (creatorRole) {
        headers['x-user-role'] = creatorRole;
      }
      
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...formData,
          startDate: formData.startDate || null,
          reportsToId: formData.reportsToId || null,
          creatorEmail: creatorEmail,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success - redirect to employees list
        router.push('/employees');
        router.refresh(); // Refresh to show updated data
      } else {
        setError(data.error || 'Error al actualizar el empleado');
      }
    } catch (err) {
      console.error('Error updating employee:', err);
      setError('Ocurrió un error al actualizar. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información del empleado...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Editar Empleado</h1>
              <p className="mt-1 text-sm text-gray-600">
                Modifica la información del empleado
              </p>
            </div>
            {canAccessContracts(userRole) && employeeId && (
              <Link
                href={`/contracts/new?userId=${employeeId}`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                + Crear Contrato
              </Link>
            )}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nombre completo *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Correo electrónico *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="ejemplo@gmail.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dni" className="block text-sm font-medium text-gray-700">
                    DNI (Documento Nacional de Identidad) *
                  </label>
                  <input
                    id="dni"
                    name="dni"
                    type="text"
                    required
                    value={formData.dni}
                    onChange={handleChange}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="0801-1990-12345"
                  />
                </div>

                <div>
                  <label htmlFor="rtn" className="block text-sm font-medium text-gray-700">
                    RTN (Registro Tributario Nacional) *
                  </label>
                  <input
                    id="rtn"
                    name="rtn"
                    type="text"
                    required
                    value={formData.rtn}
                    onChange={handleChange}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="08011990123456"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                  Número de teléfono *
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="+504 9999-9999"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Dirección de domicilio *
                </label>
                <textarea
                  id="address"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Colonia, Calle, Número de casa, Ciudad"
                />
              </div>

              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                  Fecha de inicio en la empresa *
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                  Cargo/Puesto *
                </label>
                <input
                  id="position"
                  name="position"
                  type="text"
                  required
                  value={formData.position}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Ej: Gerente de Recursos Humanos, Desarrollador, Contador"
                />
              </div>

              {assignableRoles.length > 0 && (
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                    Rol/Cargo *
                  </label>
                  <select
                    id="role"
                    name="role"
                    required
                    value={formData.role}
                    onChange={handleChange}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm bg-white"
                  >
                    {assignableRoles.map((r) => (
                      <option key={r} value={r}>
                        {getRoleDisplayName(r)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    
                  </p>
                </div>
              )}

              {/* Manager/Reports To field - only visible to Admin and HR_Staff */}
              {(userRole === 'Admin' || userRole === 'HR_Staff') && (
                <div>
                  <label htmlFor="reportsToId" className="block text-sm font-medium text-gray-700">
                    Reporta a (Manager)
                  </label>
                  <select
                    id="reportsToId"
                    name="reportsToId"
                    value={formData.reportsToId}
                    onChange={handleChange}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm bg-white"
                  >
                    <option value="">Ninguno (Sin manager)</option>
                    {availableManagers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name || manager.email} ({getRoleDisplayName(manager.role)})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Selecciona el usuario al que reporta este empleado
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Link
                href="/employees"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


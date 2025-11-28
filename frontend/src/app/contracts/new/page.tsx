'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { canAccessContracts } from '@/lib/contractAccess';

interface User {
  id: string;
  name: string | null;
  email: string;
  position: string | null;
  startDate: Date | null;
}

export default function NewContractPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  const [formData, setFormData] = useState({
    userId: '',
    salary: '',
    startDate: '',
    endDate: '',
    contractType: '',
    status: 'Active',
    notes: '',
  });

  useEffect(() => {
    // Check user role and access
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole');
      setUserRole(role);
      setHasAccess(canAccessContracts(role));
      
      if (canAccessContracts(role)) {
        fetchUsers();
      } else {
        setLoading(false);
      }
    }
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch all employees (no pagination needed for dropdown)
      const response = await fetch('/api/employees?limit=1000');
      if (response.ok) {
        const data = await response.json();
        // The API returns { employees: [...], pagination: {...} }
        const employees = Array.isArray(data.employees) ? data.employees : [];
        setUsers(employees);
        
        // Check if userId is provided in query params
        const userIdParam = searchParams.get('userId');
        if (userIdParam && employees.length > 0) {
          const selectedUser = employees.find((u: User) => u.id === userIdParam);
          if (selectedUser) {
            handleUserSelect(userIdParam);
          }
        } else {
          // Set default startDate to today
          const today = new Date().toISOString().split('T')[0];
          setFormData(prev => ({ ...prev, startDate: today }));
        }
      } else {
        setError('Error al cargar los empleados');
        setUsers([]); // Ensure users is always an array
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Error al cargar los empleados');
      setUsers([]); // Ensure users is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUserSelect = (userId: string) => {
    const selectedUser = users.find(u => u.id === userId);
    setFormData({
      ...formData,
      userId,
      // If user has a startDate, use it as default
      startDate: selectedUser?.startDate 
        ? new Date(selectedUser.startDate).toISOString().split('T')[0]
        : formData.startDate,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (!formData.userId || !formData.salary || !formData.startDate) {
        setError('Usuario, salario y fecha de inicio son requeridos');
        setSaving(false);
        return;
      }

      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole || '',
        },
        body: JSON.stringify({
          userId: formData.userId,
          salary: parseFloat(formData.salary),
          startDate: formData.startDate,
          endDate: formData.endDate || null,
          contractType: formData.contractType || null,
          status: formData.status,
          notes: formData.notes || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/contracts?created=true');
      } else {
        const errorMessage = data.error || 'Error al crear el contrato';
        const details = data.details ? `: ${data.details}` : '';
        setError(`${errorMessage}${details}`);
      }
    } catch (err) {
      setError('Ocurrió un error. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h1>
              <p className="text-gray-600 mb-6">
                Solo los administradores y el personal de RRHH pueden crear contratos.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Volver al Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Nuevo Contrato</h1>
            <p className="mt-1 text-sm text-gray-600">
              Crear un nuevo contrato para un empleado
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
                  Empleado *
                </label>
                <select
                  id="userId"
                  name="userId"
                  required
                  value={formData.userId}
                  onChange={(e) => handleUserSelect(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">Seleccionar empleado</option>
                  {Array.isArray(users) && users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email} {user.position ? `- ${user.position}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="salary" className="block text-sm font-medium text-gray-700">
                  Salario (HNL) *
                </label>
                <input
                  id="salary"
                  name="salary"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.salary}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                    Fecha de Inicio *
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
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                    Fecha de Fin (Opcional)
                  </label>
                  <input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={handleChange}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contractType" className="block text-sm font-medium text-gray-700">
                    Tipo de Contrato
                  </label>
                  <select
                    id="contractType"
                    name="contractType"
                    value={formData.contractType}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Seleccionar tipo</option>
                    <option value="Permanent">Trabajador por tiempo indefinido</option>
                    <option value="Temporary">Trabajador por tiempo definido</option>
                    <option value="Contract">Prestacion de sercivios</option>
                    <option value="Internship">Pasantía</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Estado *
                  </label>
                  <select
                    id="status"
                    name="status"
                    required
                    value={formData.status}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="Active">Activo</option>
                    <option value="Terminated">Terminado</option>
                    <option value="Expired">Expirado</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notas
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Notas adicionales sobre el contrato..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Link
                href="/contracts"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Creando...' : 'Crear Contrato'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


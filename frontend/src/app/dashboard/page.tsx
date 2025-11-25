'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { canAccessContracts } from '@/lib/contractAccess';

interface LeaveRequest {
  id: string;
  startDate: Date;
  endDate: Date;
  type: string;
  status: string;
  user: {
    name: string | null;
    email: string;
  };
}

export default function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole');
      const email = localStorage.getItem('userEmail');
      setUserRole(role);
      setUserEmail(email);
      
      // Fetch pending leave requests
      if (role) {
        fetchPendingRequests(role, email);
      }
    }
  }, []);

  const fetchPendingRequests = async (role: string | null, email: string | null) => {
    setLoadingRequests(true);
    try {
      const response = await fetch('/api/leave-requests', {
        headers: {
          'x-user-role': role || '',
          'x-user-email': email || '',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filter to show only pending requests
        const pending = data.filter((req: LeaveRequest) => req.status === 'Pending');
        // Limit to 5 most recent
        setPendingRequests(pending.slice(0, 5));
      }
    } catch (err) {
      console.error('Error fetching pending requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    // Check if employee was just added
    if (searchParams.get('employeeAdded') === 'true') {
      setShowSuccess(true);
      // Remove query parameter from URL
      router.replace('/dashboard', { scroll: false });
      // Hide message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {showSuccess && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              ¡Empleado agregado exitosamente!
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Bienvenido a la Plataforma de Recursos Humanos</p>
          
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/employees"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
            >
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Ver Empleados</p>
                <p className="text-sm text-gray-500 truncate">Lista de todos los empleados</p>
              </div>
            </Link>

            <Link
              href="/register?from=dashboard"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
            >
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Agregar Empleado</p>
                <p className="text-sm text-gray-500 truncate">Registrar nuevo empleado</p>
              </div>
            </Link>

            <Link
              href="/employees/bulk"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
            >
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Agregar en Masa</p>
                <p className="text-sm text-gray-500 truncate">Agregar múltiples empleados</p>
              </div>
            </Link>

            <Link
              href="/hierarchy"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
            >
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Jerarquía</p>
                <p className="text-sm text-gray-500 truncate">Estructura organizacional</p>
              </div>
            </Link>

            {canAccessContracts(userRole) && (
              <Link
                href="/contracts"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
              >
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Contratos</p>
                  <p className="text-sm text-gray-500 truncate">Gestión de contratos y salarios</p>
                </div>
              </Link>
            )}

            <Link
              href="/leave-requests"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
            >
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Solicitudes de Permiso</p>
                <p className="text-sm text-gray-500 truncate">
                  {userRole === 'Admin' || userRole === 'HR_Staff' 
                    ? 'Gestionar solicitudes' 
                    : 'Ver mis solicitudes'}
                </p>
              </div>
            </Link>
          </div>

          {/* Pending Leave Requests Section */}
          {(userRole === 'Admin' || userRole === 'HR_Staff' || userRole === 'employee') && (
            <div className="mt-8">
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900">
                      {userRole === 'Admin' || userRole === 'HR_Staff' 
                        ? 'Solicitudes Pendientes' 
                        : 'Mis Solicitudes Pendientes'}
                    </h2>
                    <Link
                      href={userRole === 'Admin' || userRole === 'HR_Staff' 
                        ? '/leave-requests/manage' 
                        : '/leave-requests'}
                      className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
                    >
                      Ver todas →
                    </Link>
                  </div>
                </div>
                <div className="px-6 py-4">
                  {loadingRequests ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">Cargando...</p>
                    </div>
                  ) : pendingRequests.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No hay solicitudes pendientes.
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {pendingRequests.map((request) => (
                        <li key={request.id} className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              {(userRole === 'Admin' || userRole === 'HR_Staff') && (
                                <p className="text-sm font-medium text-gray-900">
                                  {request.user.name || request.user.email}
                                </p>
                              )}
                              <p className="text-sm text-gray-500">
                                {request.type === 'Vacation' ? 'Vacaciones' :
                                 request.type === 'Sick Leave' ? 'Día por Enfermedad' :
                                 request.type === 'Personal' ? 'Día Personal' :
                                 request.type}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(request.startDate).toLocaleDateString('es-HN')} - {new Date(request.endDate).toLocaleDateString('es-HN')}
                              </p>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pendiente
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!loadingRequests && pendingRequests.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <Link
                        href={userRole === 'Admin' || userRole === 'HR_Staff' 
                          ? '/leave-requests/manage' 
                          : '/leave-requests'}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        Ver todas las solicitudes →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
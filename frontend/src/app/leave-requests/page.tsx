'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface LeaveRequest {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  type: string;
  reason: string | null;
  status: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  comments: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    position: string | null;
  };
}

function LeaveRequestsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    // Get user info
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole');
      const email = localStorage.getItem('userEmail');
      setUserRole(role);
      setUserEmail(email);
      fetchLeaveRequests(role, email);
    }

    // Check for success messages
    if (searchParams.get('created') === 'true') {
      setShowSuccess(true);
      router.replace('/leave-requests', { scroll: false });
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [searchParams, router]);

  const fetchLeaveRequests = async (role: string | null, email: string | null) => {
    try {
      const response = await fetch('/api/leave-requests', {
        headers: {
          'x-user-role': role || '',
          'x-user-email': email || '',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setLeaveRequests(data);
      } else if (response.status === 403) {
        setError('No tienes permiso para ver solicitudes de permiso');
      } else {
        setError('Error al cargar las solicitudes de permiso');
      }
    } catch (err) {
      setError('Error al cargar las solicitudes de permiso');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    switch (status) {
      case 'Pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'Approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'Rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'Pendiente';
      case 'Approved':
        return 'Aprobada';
      case 'Rejected':
        return 'Rechazada';
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'Vacation':
        return 'Vacaciones';
      case 'Sick Leave':
        return 'Día por Enfermedad';
      case 'Personal':
        return 'Día Personal';
      case 'Other':
        return 'Otro';
      default:
        return type;
    }
  };

  const filteredRequests = filterStatus === 'all' 
    ? leaveRequests 
    : leaveRequests.filter(req => req.status === filterStatus);

  const isAdminOrHR = userRole === 'Admin' || userRole === 'HR_Staff';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando solicitudes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Solicitudes de Permiso</h1>
              <p className="mt-1 text-sm text-gray-600">
                {isAdminOrHR ? 'Todas las solicitudes de permiso' : 'Mis solicitudes de permiso'}
              </p>
            </div>
            <div className="flex space-x-3">
              {!isAdminOrHR && (
                <Link
                  href="/leave-requests/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Nueva Solicitud
                </Link>
              )}
              {isAdminOrHR && (
                <Link
                  href="/leave-requests/manage"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Gestionar Solicitudes
                </Link>
              )}
            </div>
          </div>

          {showSuccess && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              ¡Solicitud de permiso creada exitosamente!
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Filter by Status */}
          <div className="mb-4 bg-white shadow rounded-lg p-4">
            <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Estado
            </label>
            <select
              id="filterStatus"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="block w-full md:w-48 px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="all">Todos</option>
              <option value="Pending">Pendiente</option>
              <option value="Approved">Aprobada</option>
              <option value="Rejected">Rechazada</option>
            </select>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <p className="text-gray-500">
                {filterStatus === 'all' 
                  ? 'No hay solicitudes de permiso.' 
                  : `No hay solicitudes con estado "${getStatusLabel(filterStatus)}".`}
              </p>
              {!isAdminOrHR && (
                <Link
                  href="/leave-requests/new"
                  className="mt-4 inline-flex items-center text-indigo-600 hover:text-indigo-500"
                >
                  Crear primera solicitud →
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <li key={request.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <span className={getStatusBadge(request.status)}>
                              {getStatusLabel(request.status)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              {isAdminOrHR && (
                                <p className="text-sm font-medium text-gray-900">
                                  {request.user.name || request.user.email}
                                </p>
                              )}
                              <p className="text-sm text-gray-500">
                                {getTypeLabel(request.type)}
                              </p>
                            </div>
                            <p className="mt-1 text-sm text-gray-500">
                              {formatDate(request.startDate)} - {formatDate(request.endDate)}
                            </p>
                            {request.reason && (
                              <p className="mt-1 text-sm text-gray-600">
                                {request.reason}
                              </p>
                            )}
                            {request.comments && (
                              <p className="mt-1 text-sm text-gray-500 italic">
                                Comentarios: {request.comments}
                              </p>
                            )}
                            {request.reviewedAt && (
                              <p className="mt-1 text-xs text-gray-400">
                                Revisado el {formatDate(request.reviewedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-sm text-gray-500">
                        {formatDate(request.createdAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
            <Link
              href="/dashboard"
              className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
            >
              ← Volver al Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeaveRequestsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <LeaveRequestsList />
    </Suspense>
  );
}


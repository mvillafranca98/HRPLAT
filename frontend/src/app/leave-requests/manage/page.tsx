'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  user: {
    id: string;
    name: string | null;
    email: string;
    position: string | null;
  };
}

export default function ManageLeaveRequestsPage() {
  const router = useRouter();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole');
      const email = localStorage.getItem('userEmail');
      setUserRole(role);
      setUserEmail(email);

      // Check if user has access
      if (role !== 'Admin' && role !== 'HR_Staff') {
        setError('No tienes permiso para gestionar solicitudes de permiso');
        setLoading(false);
        return;
      }

      fetchPendingRequests(role, email);
    }
  }, []);

  const fetchPendingRequests = async (role: string | null, email: string | null) => {
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
        const pendingRequests = data.filter((req: LeaveRequest) => req.status === 'Pending');
        setLeaveRequests(pendingRequests);
      } else {
        setError('Error al cargar las solicitudes de permiso');
      }
    } catch (err) {
      setError('Error al cargar las solicitudes de permiso');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = (request: LeaveRequest, actionType: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setAction(actionType);
    setComments('');
    setShowModal(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedRequest || !action) return;

    setProcessingId(selectedRequest.id);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/leave-requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole || '',
          'x-user-email': userEmail || '',
        },
        body: JSON.stringify({
          status: action === 'approve' ? 'Approved' : 'Rejected',
          comments: comments.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || `Solicitud ${action === 'approve' ? 'aprobada' : 'rechazada'} exitosamente`);
        setShowModal(false);
        // Refresh the list
        fetchPendingRequests(userRole, userEmail);
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.error || 'Error al procesar la solicitud');
      }
    } catch (err) {
      setError('Ocurrió un error. Por favor intenta de nuevo.');
    } finally {
      setProcessingId(null);
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

  const calculateDays = (startDate: Date, endDate: Date) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

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

  if (userRole !== 'Admin' && userRole !== 'HR_Staff') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h1>
              <p className="text-gray-600 mb-6">
                Solo los administradores y el personal de RRHH pueden gestionar solicitudes de permiso.
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
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Gestionar Solicitudes de Permiso</h1>
            <p className="mt-1 text-sm text-gray-600">
              Aprobar o rechazar solicitudes pendientes
            </p>
          </div>

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {leaveRequests.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <p className="text-gray-500">No hay solicitudes pendientes.</p>
              <Link
                href="/leave-requests"
                className="mt-4 inline-flex items-center text-indigo-600 hover:text-indigo-500"
              >
                Ver todas las solicitudes →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {leaveRequests.map((request) => (
                <div key={request.id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {request.user.name || request.user.email}
                        </h3>
                        {request.user.position && (
                          <span className="text-sm text-gray-500">
                            {request.user.position}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Tipo</p>
                          <p className="text-sm text-gray-900">{getTypeLabel(request.type)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Duración</p>
                          <p className="text-sm text-gray-900">
                            {calculateDays(request.startDate, request.endDate)} día(s)
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Fecha de Inicio</p>
                          <p className="text-sm text-gray-900">{formatDate(request.startDate)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Fecha de Fin</p>
                          <p className="text-sm text-gray-900">{formatDate(request.endDate)}</p>
                        </div>
                      </div>
                      {request.reason && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700">Razón</p>
                          <p className="text-sm text-gray-900 mt-1">{request.reason}</p>
                        </div>
                      )}
                      <div className="mt-4">
                        <p className="text-xs text-gray-500">
                          Solicitado el {formatDate(request.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="ml-6 flex space-x-2">
                      <button
                        onClick={() => handleApproveReject(request, 'approve')}
                        disabled={processingId === request.id}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleApproveReject(request, 'reject')}
                        disabled={processingId === request.id}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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

      {/* Confirmation Modal */}
      {showModal && selectedRequest && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {action === 'approve' ? 'Aprobar Solicitud' : 'Rechazar Solicitud'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {action === 'approve' 
                    ? '¿Estás seguro de que deseas aprobar esta solicitud de permiso?'
                    : '¿Estás seguro de que deseas rechazar esta solicitud de permiso?'}
                </p>
                <div className="mb-4">
                  <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
                    Comentarios (Opcional)
                  </label>
                  <textarea
                    id="comments"
                    rows={3}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Añade comentarios sobre tu decisión..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedRequest(null);
                      setAction(null);
                      setComments('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmAction}
                    disabled={processingId === selectedRequest.id}
                    className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      action === 'approve'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {processingId === selectedRequest.id 
                      ? 'Procesando...' 
                      : action === 'approve' 
                        ? 'Aprobar' 
                        : 'Rechazar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


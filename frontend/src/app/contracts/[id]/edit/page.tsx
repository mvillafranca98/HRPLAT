'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { canAccessContracts, canViewAllContracts } from '@/lib/contractAccess';

interface Contract {
  id: string;
  userId: string;
  salary: number;
  startDate: Date;
  endDate: Date | null;
  contractType: string | null;
  status: string;
  notes: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    position: string | null;
  };
}

export default function EditContractPage() {
  const router = useRouter();
  const params = useParams();
  const contractId = params?.id as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  const [formData, setFormData] = useState({
    salary: '',
    startDate: '',
    endDate: '',
    contractType: '',
    status: 'Active',
    notes: '',
  });

  useEffect(() => {
    // Check user role and access (only Admin and HR_Staff can edit)
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole');
      setUserRole(role);
      setHasAccess(canViewAllContracts(role)); // Only Admin and HR_Staff can edit
      
      if (canViewAllContracts(role) && contractId) {
        fetchContract(role);
      } else {
        setLoading(false);
      }
    }
  }, [contractId]);

  const fetchContract = async (role: string | null) => {
    try {
      const userEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
      
      const response = await fetch(`/api/contracts/${contractId}`, {
        headers: {
          'x-user-role': role || '',
          'x-user-email': userEmail || '',
        },
      });
      
      if (response.ok) {
        const data: Contract = await response.json();
        setContract(data);
        setFormData({
          salary: data.salary.toString(),
          startDate: new Date(data.startDate).toISOString().split('T')[0],
          endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '',
          contractType: data.contractType || '',
          status: data.status,
          notes: data.notes || '',
        });
      } else if (response.status === 403) {
        setError('No tienes permiso para editar contratos');
      } else {
        setError('Error al cargar el contrato');
      }
    } catch (err) {
      setError('Error al cargar el contrato');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (!contractId) {
        setError('ID de contrato no válido');
        setSaving(false);
        return;
      }

      const userEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
      
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole || '',
          'x-user-email': userEmail || '',
        },
        body: JSON.stringify({
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
        router.push('/contracts?updated=true');
      } else {
        setError(data.error || 'Error al actualizar el contrato');
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
          <p className="mt-4 text-gray-600">Cargando contrato...</p>
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
                Solo los administradores y el personal de RRHH pueden editar contratos.
              </p>
              <Link
                href="/contracts"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Volver a Contratos
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Contrato no encontrado</h1>
              <Link
                href="/contracts"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Volver a Contratos
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
            <h1 className="text-3xl font-bold text-gray-900">Editar Contrato</h1>
            <p className="mt-1 text-sm text-gray-600">
              Contrato de: {contract.user.name || contract.user.email}
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600">Empleado</p>
                <p className="text-lg font-medium text-gray-900">
                  {contract.user.name || contract.user.email}
                </p>
                {contract.user.position && (
                  <p className="text-sm text-gray-500">{contract.user.position}</p>
                )}
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
                    <option value="Permanent">Permanente</option>
                    <option value="Temporary">Temporal</option>
                    <option value="Contract">Por Contrato</option>
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
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


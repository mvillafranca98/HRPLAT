'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewLeaveRequestPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [vacationBalance, setVacationBalance] = useState<{
    entitlement: number;
    taken: number;
    available: number;
    yearsOfService: number;
    isInTrialPeriod: boolean;
    daysUntilEligible: number;
    nextAnniversary: string | null;
  } | null>(null);

  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    type: '',
    reason: '',
  });

  useEffect(() => {
    // Get user info
    if (typeof window !== 'undefined') {
      const email = localStorage.getItem('userEmail');
      const role = localStorage.getItem('userRole');
      setUserEmail(email);
      setUserRole(role);

      // Set default start date to today
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, startDate: today }));
    }
  }, []);

  useEffect(() => {
    async function fetchVacationBalance() {
      try {
        const email = localStorage.getItem('userEmail');
        const role = localStorage.getItem('userRole');
        
        if (!email) return;

        const response = await fetch('/api/vacation-balance', {
          headers: {
            'x-user-email': email,
            'x-user-role': role || '',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setVacationBalance({
            entitlement: data.entitlement,
            taken: data.taken,
            available: data.available,
            yearsOfService: data.yearsOfService,
            isInTrialPeriod: data.isInTrialPeriod,
            daysUntilEligible: data.daysUntilEligible,
            nextAnniversary: data.nextAnniversary,
          });
        }
      } catch (err) {
        console.error('Error fetching vacation balance:', err);
      }
    }

    fetchVacationBalance();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const calculateRequestedDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    let days = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Count only weekdays (Monday-Friday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (!formData.startDate || !formData.endDate || !formData.type) {
        setError('Fecha de inicio, fecha de fin y tipo son requeridos');
        setSaving(false);
        return;
      }

      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail || '',
          'x-user-role': userRole || '',
        },
        body: JSON.stringify({
          startDate: formData.startDate,
          endDate: formData.endDate,
          type: formData.type,
          reason: formData.reason || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/leave-requests?created=true');
      } else {
        const errorMessage = data.error || 'Error al crear la solicitud de permiso';
        const details = data.details ? `: ${data.details}` : '';
        setError(`${errorMessage}${details}`);
      }
    } catch (err) {
      setError('Ocurrió un error. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Nueva Solicitud de Permiso</h1>
            <p className="mt-1 text-sm text-gray-600">
              Solicitar tiempo libre (vacaciones, días personales, etc.)
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
            <div className="space-y-4">
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
                    Fecha de Fin *
                  </label>
                  <input
                    id="endDate"
                    name="endDate"
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={handleChange}
                    min={formData.startDate}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                  Tipo de Permiso *
                </label>
                <select
                  id="type"
                  name="type"
                  required
                  value={formData.type}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">Seleccionar tipo</option>
                  <option value="Vacation">Vacaciones</option>
                  <option value="Sick Leave">Día por Enfermedad</option>
                  <option value="Personal">Día Personal</option>
                  <option value="Other">Otro</option>
                </select>
              </div>

              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                  Razón (Opcional)
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  rows={4}
                  value={formData.reason}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Proporciona detalles adicionales sobre tu solicitud de permiso..."
                />
              </div>

              {/* Vacation Balance Display */}
              {formData.type === 'Vacation' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  {vacationBalance ? (
                    <>
                      {vacationBalance.isInTrialPeriod ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                          <p className="text-sm font-medium text-yellow-800">
                            ⚠️ Período de Prueba
                          </p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Todavía estás en período de prueba. Faltan {vacationBalance.daysUntilEligible} días para ser elegible para vacaciones.
                          </p>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-sm font-medium text-blue-900 mb-3">
                            Balance de Vacaciones
                          </h3>
                          <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                            <div>
                              <p className="text-blue-600 text-xs mb-1">Derecho Acumulado</p>
                              <p className="text-lg font-semibold text-blue-900">
                                {vacationBalance.entitlement} días
                              </p>
                              <p className="text-xs text-blue-500">
                                Año {vacationBalance.yearsOfService + 1}
                              </p>
                            </div>
                            <div>
                              <p className="text-blue-600 text-xs mb-1">Días Tomados</p>
                              <p className="text-lg font-semibold text-blue-900">
                                {vacationBalance.taken} días
                              </p>
                            </div>
                            <div>
                              <p className="text-blue-600 text-xs mb-1">Días Disponibles</p>
                              <p className={`text-lg font-semibold ${
                                vacationBalance.available > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {vacationBalance.available} días
                              </p>
                            </div>
                          </div>
                          {formData.startDate && formData.endDate && (
                            <div className="pt-3 border-t border-blue-200">
                              <p className="text-sm text-blue-700">
                                Días solicitados en esta solicitud: <span className="font-semibold">
                                  {calculateRequestedDays()} días
                                </span>
                                {calculateRequestedDays() > vacationBalance.available && (
                                  <span className="text-red-600 ml-2 font-semibold">
                                    ⚠️ Excede días disponibles
                                  </span>
                                )}
                              </p>
                              {vacationBalance.nextAnniversary && (
                                <p className="text-xs text-blue-600 mt-1">
                                  Próximo aniversario: {new Date(vacationBalance.nextAnniversary).toLocaleDateString('es-HN')}
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-blue-700">Cargando balance de vacaciones...</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Link
                href="/leave-requests"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


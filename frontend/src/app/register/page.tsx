'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Role, getAssignableRoles, getRoleDisplayName } from '@/lib/roles';

function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dni, setDni] = useState('');
  const [rtn, setRtn] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFromDashboard, setIsFromDashboard] = useState(false);
  const [role, setRole] = useState<Role>(Role.employee);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [assignableRoles, setAssignableRoles] = useState<Role[]>([Role.employee]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [position, setPosition] = useState('');

  useEffect(() => {
    // Check if user came from dashboard or is already logged in
    const fromDashboard = searchParams.get('from') === 'dashboard';
    const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('userEmail') !== null;
    
    if (fromDashboard || isLoggedIn) {
      setIsFromDashboard(true);
      // Get current user's role from localStorage
      const currentUserRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
      setUserRole(currentUserRole);
      
      // Get roles that can be assigned based on current user's role
      const assignable = getAssignableRoles(currentUserRole);
      setAssignableRoles(assignable);
      
      // Set default role to the highest assignable role (or employee if none)
      if (assignable.length > 0) {
        setRole(assignable[assignable.length - 1]); // Highest role user can assign
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const creatorEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          name,
          dni,
          rtn,
          phoneNumber,
          address,
          startDate: startDate || null,
          position,
          role: isFromDashboard ? role : Role.employee,
          creatorEmail: isFromDashboard ? creatorEmail : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Registration successful - redirect based on context
        if (isFromDashboard) {
          // If coming from dashboard, go back to dashboard
          router.push('/dashboard?employeeAdded=true');
        } else {
          // If new user registration, go to login
          router.push('/?registered=true');
        }
      } else {
        setError(data.error || 'Error al crear la cuenta');
      }
    } catch (err) {
      setError('Ocurrió un error. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Plataforma de Recursos Humanos</h1>
          <p className="mt-2 text-gray-600">
            {isFromDashboard ? 'Agregar Nuevo Empleado' : 'Crea una nueva cuenta'}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nombre completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Juan Pérez"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="ejemplo@gmail.com"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="••••••••"
                minLength={6}
              />
              <p className="mt-1 text-xs text-gray-500">Mínimo 6 caracteres</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="dni" className="block text-sm font-medium text-gray-700">
                  DNI (Documento Nacional de Identidad)
                </label>
                <input
                  id="dni"
                  name="dni"
                  type="text"
                  required
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="0801-1990-12345"
                />
              </div>

              <div>
                <label htmlFor="rtn" className="block text-sm font-medium text-gray-700">
                  RTN (Registro Tributario Nacional)
                </label>
                <input
                  id="rtn"
                  name="rtn"
                  type="text"
                  required
                  value={rtn}
                  onChange={(e) => setRtn(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="08011990123456"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                Número de teléfono
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="+504 9999-9999"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Dirección de domicilio
              </label>
              <textarea
                id="address"
                name="address"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Colonia, Calle, Número de casa, Ciudad"
              />
            </div>

            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                Fecha de inicio en la empresa
              </label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
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
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Ej: Gerente de Recursos Humanos, Desarrollador, Contador, etc."
              />
            </div>

            {isFromDashboard && assignableRoles.length > 0 && (
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Rol/Cargo *
                </label>
                <select
                  id="role"
                  name="role"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm bg-white"
                >
                  {assignableRoles.map((r) => (
                    <option key={r} value={r}>
                      {getRoleDisplayName(r)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Tu rol actual: {userRole ? getRoleDisplayName(userRole) : 'No disponible'}
                </p>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </div>

          {!isFromDashboard && (
            <div className="text-center text-sm">
              <span className="text-gray-600">¿Ya tienes una cuenta? </span>
              <Link href="/" className="font-medium text-indigo-600 hover:text-indigo-500">
                Inicia sesión
              </Link>
            </div>
          )}
          
          {isFromDashboard && (
            <div className="text-center text-sm">
              <Link href="/dashboard" className="font-medium text-indigo-600 hover:text-indigo-500">
                ← Volver al Dashboard
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}


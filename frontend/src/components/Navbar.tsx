'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getRoleDisplayName } from '@/lib/roles';
import { canAccessContracts } from '@/lib/contractAccess';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Get user email and role from localStorage
  useEffect(() => {
    const updateUserData = () => {
      if (typeof window !== 'undefined') {
        const email = localStorage.getItem('userEmail');
        const role = localStorage.getItem('userRole');
        setUserEmail(email);
        setUserRole(role);
      }
    };

    // Initial load and on pathname change (when navigating after login)
    updateUserData();

    // Listen for storage changes (e.g., when user logs in on another tab)
    // Note: 'storage' event only fires for changes from other tabs/windows
    // For same-tab changes, we rely on pathname dependency
    window.addEventListener('storage', updateUserData);

    return () => {
      window.removeEventListener('storage', updateUserData);
    };
  }, [pathname]);

  const handleLogout = () => {
    // Clear stored user data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      localStorage.removeItem('userRole');
    }
    // Redirect to login
    router.push('/');
    router.refresh();
  };

  // Don't show navbar on login/register/forgot-password/change-password pages
  if (pathname === '/' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/change-password') {
    return null;
  }

  // Check if user is on a reset-password page (dynamic route)
  if (pathname?.startsWith('/reset-password/')) {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and Navigation Links */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-indigo-600">
                HR Platform
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/dashboard"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  pathname === '/dashboard'
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/employees"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  pathname === '/employees' || pathname?.startsWith('/employees/')
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Empleados
              </Link>
              <Link
                href="/register?from=dashboard"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  pathname === '/register'
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Agregar Empleado
              </Link>
              <Link
                href="/hierarchy"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  pathname === '/hierarchy'
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Jerarquía
              </Link>
              <Link
                href="/leave-requests"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  pathname === '/leave-requests' || pathname?.startsWith('/leave-requests/')
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Solicitudes
              </Link>
              {canAccessContracts(userRole) && (
                <Link
                  href="/contracts"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                    pathname === '/contracts' || pathname?.startsWith('/contracts/')
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Contratos
                </Link>
              )}
            </div>
          </div>

          {/* Right side - User email, role and logout */}
          <div className="flex items-center space-x-4">
            {userEmail && (
              <div className="hidden sm:block text-right">
                <span className="text-sm text-gray-700 block">{userEmail}</span>
                {userRole && (
                  <span className="text-xs text-gray-500">
                    {getRoleDisplayName(userRole)}
                  </span>
                )}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1 px-4">
          <Link
            href="/dashboard"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              pathname === '/dashboard'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-500'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/employees"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              pathname === '/employees' || pathname?.startsWith('/employees/')
                ? 'bg-indigo-50 text-indigo-700 border-indigo-500'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Empleados
          </Link>
          <Link
            href="/register?from=dashboard"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              pathname === '/register'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-500'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Agregar Empleado
          </Link>
          <Link
            href="/hierarchy"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              pathname === '/hierarchy'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-500'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Jerarquía
          </Link>
          <Link
            href="/leave-requests"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              pathname === '/leave-requests' || pathname?.startsWith('/leave-requests/')
                ? 'bg-indigo-50 text-indigo-700 border-indigo-500'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Solicitudes
          </Link>
          {canAccessContracts(userRole) && (
            <Link
              href="/contracts"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                pathname === '/contracts' || pathname?.startsWith('/contracts/')
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-500'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Contratos
            </Link>
          )}
        </div>
        {userEmail && (
          <div className="pt-4 pb-3 border-t border-gray-200 px-4">
            <div className="text-sm text-gray-700">{userEmail}</div>
            {userRole && (
              <div className="text-xs text-gray-500 mt-1">
                {getRoleDisplayName(userRole)}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}


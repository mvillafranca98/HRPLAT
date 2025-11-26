'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getRoleDisplayName, canEditUser, getRoleLevel } from '@/lib/roles';
import ColumnVisibilityToggle from '@/components/ColumnVisibilityToggle';
import { getColumnVisibility } from '@/lib/columnVisibility';
import { maskPhoneNumber, maskDNI, maskRTN, parsePhoneWithAreaCode, formatPhoneWithAreaCode } from '@/lib/inputMasks';

interface Employee {
  id: string;
  name: string | null;
  dni: string | null;
  rtn: string | null;
  phoneNumber: string | null;
  address: string | null;
  startDate: Date | null;
  position: string | null;
  email: string;
  role: string;
  reportsToId: string | null;
  reportsTo: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface EmployeesResponse {
  employees: Employee[];
  pagination: PaginationInfo;
}

function EmployeesList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const ITEMS_PER_PAGE = 10; // Number of employees per page (within 10-20 range)
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(''); // Immediate value for input field
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(''); // Debounced value for API calls
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof Employee | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Ref to maintain focus on search input
  const searchInputRef = useRef<HTMLInputElement>(null);
  const wasSearchFocusedRef = useRef(false);

  // Column definitions for visibility toggle
  const tableColumns = useMemo(() => [
    { key: 'name', label: 'Nombre Completo' },
    { key: 'dni', label: 'DNI' },
    { key: 'rtn', label: 'RTN' },
    { key: 'phoneNumber', label: 'Teléfono' },
    { key: 'address', label: 'Dirección' },
    { key: 'startDate', label: 'Fecha de Inicio' },
    { key: 'email', label: 'Email' },
    { key: 'position', label: 'Cargo/Puesto' },
    { key: 'role', label: 'Rol' },
    { key: 'reportsTo', label: 'Manager' },
    { key: 'actions', label: 'Acciones' },
  ], []);

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() =>
    getColumnVisibility('employees-table', tableColumns.map(col => col.key))
  );

  // Debounce search query - update debounced value after user stops typing for 500ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // Wait 500ms after user stops typing

    return () => {
      clearTimeout(timer); // Clear timer if user types again
    };
  }, [searchQuery]);

  useEffect(() => {
    // Get current user info
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole');
      const email = localStorage.getItem('userEmail');
      setUserRole(role);
      setUserEmail(email);
    }
    
    // Check if bulk add was successful
    if (searchParams.get('bulkSuccess') === 'true') {
      setShowSuccess(true);
      setCurrentPage(1);
      router.replace('/employees', { scroll: false });
      setTimeout(() => setShowSuccess(false), 5000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router]);

  // Initial fetch and refetch when filters/sort change
  useEffect(() => {
    fetchEmployees(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchEmployees = async (page: number = currentPage) => {
    try {
      setLoading(true);
      setError('');
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });
      
      // Add search parameter if provided (use debounced value)
      if (debouncedSearchQuery.trim()) {
        params.append('search', debouncedSearchQuery.trim());
      }
      
      // Add role filter if not 'all'
      if (roleFilter !== 'all') {
        params.append('role', roleFilter);
      }
      
      // Add sort parameters if provided
      if (sortField) {
        params.append('sortBy', sortField);
        params.append('sortOrder', sortDirection);
      }
      
      const response = await fetch(`/api/employees?${params.toString()}`);
      
      if (response.ok) {
        const data: EmployeesResponse = await response.json();
        setEmployees(data.employees);
        setPagination(data.pagination);
        
        // Find current user's ID using email from localStorage (more reliable)
        const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
        if (currentUserEmail) {
          const currentUser = data.employees.find((e: Employee) => e.email === currentUserEmail);
          if (currentUser) {
            setUserId(currentUser.id);
          }
        }
      } else {
        setError('Error al cargar los empleados');
      }
    } catch (err) {
      setError('Error al cargar los empleados');
    } finally {
      setLoading(false);
    }
  };
  
  // Restore focus to search input after loading completes if it was focused before
  useEffect(() => {
    if (!loading && wasSearchFocusedRef.current && searchInputRef.current && searchQuery) {
      // Use requestAnimationFrame to ensure DOM has updated after re-render
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
            // Restore cursor position to end of input
            const length = searchInputRef.current.value.length;
            searchInputRef.current.setSelectionRange(length, length);
          }
        }, 10);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Refetch when filters or sort change (resets to page 1)
  // Use debouncedSearchQuery instead of searchQuery to avoid triggering on every keystroke
  useEffect(() => {
    // Reset to page 1 when filters or sort change
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      // If already on page 1, trigger fetch directly
      fetchEmployees(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, roleFilter, sortField, sortDirection]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (pagination?.totalPages || 1)) {
      setCurrentPage(newPage);
      fetchEmployees(newPage);
      // Scroll to top when page changes for better UX
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle previous page
  const handlePrevious = () => {
    if (pagination?.hasPreviousPage) {
      handlePageChange(currentPage - 1);
    }
  };

  // Handle next page
  const handleNext = () => {
    if (pagination?.hasNextPage) {
      handlePageChange(currentPage + 1);
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Page reset and refetch handled by useEffect
  };
  
  // Track when search input gains focus
  const handleSearchFocus = () => {
    wasSearchFocusedRef.current = true;
  };
  
  // Track when search input loses focus (but only if focus moves outside the component)
  const handleSearchBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Only mark as unfocused if focus moves outside the search input AND we're not loading
    // This prevents losing focus during re-renders while typing/searching
    if (!loading) {
      setTimeout(() => {
        if (document.activeElement !== searchInputRef.current && document.activeElement?.id !== 'search') {
          wasSearchFocusedRef.current = false;
        }
      }, 100);
    }
  };

  // Handle role filter change
  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value);
    // Page reset and refetch handled by useEffect
  };

  // Handle column sorting
  const handleSort = (field: keyof Employee) => {
    if (sortField === field) {
      // Toggle sort direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field with ascending direction
      setSortField(field);
      setSortDirection('asc');
    }
    // Refetch handled by useEffect
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearchQuery(''); // Clear debounced value immediately
    setRoleFilter('all');
    setSortField(null);
    setSortDirection('asc');
    // Page reset and refetch handled by useEffect
  };
  
  // Check if current user can edit an employee
  const canEditEmployee = (employee: Employee): boolean => {
    // Get current role from state or localStorage as fallback
    const currentRole = userRole || (typeof window !== 'undefined' ? localStorage.getItem('userRole') : null);
    
    if (!currentRole) return false;
    
    // Admin can edit anyone - check this first so we don't need userId
    if (currentRole === 'Admin') return true;
    
    // Get current userId from state or find it from employees list
    const currentId = userId || (() => {
      if (typeof window !== 'undefined' && employees.length > 0) {
        const currentEmail = localStorage.getItem('userEmail');
        if (currentEmail) {
          const currentUser = employees.find((e: Employee) => e.email === currentEmail);
          return currentUser?.id || null;
        }
      }
      return null;
    })();
    
    // Users can always edit themselves
    if (currentId && currentId === employee.id) return true;
    
    // Otherwise, check if user has higher role level
    const userLevel = getRoleLevel(currentRole);
    const employeeLevel = getRoleLevel(employee.role);
    return userLevel > employeeLevel;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format display values for table (handles area codes)
  const formatPhoneForDisplay = (phone: string | null): string => {
    if (!phone) return 'N/A';
    
    // Parse phone number to extract area code and number
    const parsed = parsePhoneWithAreaCode(phone);
    
    // If we found an area code, format with it
    if (parsed.areaCode && parsed.phoneNumber) {
      return formatPhoneWithAreaCode(parsed.areaCode, parsed.phoneNumber);
    }
    
    // Otherwise just format the phone number
    return maskPhoneNumber(phone);
  };

  const formatDNIForDisplay = (dni: string | null): string => {
    if (!dni) return 'N/A';
    return maskDNI(dni);
  };

  const formatRTNForDisplay = (rtn: string | null): string => {
    if (!rtn) return 'N/A';
    return maskRTN(rtn);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando empleados...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Lista de Empleados</h1>
              <p className="mt-1 text-sm text-gray-600">
                Administración de recursos humanos
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                href="/employees/bulk"
                className="inline-flex items-center px-4 py-2 border border-indigo-600 text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Agregar en Masa
              </Link>
              <Link
                href="/register?from=dashboard"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Agregar Empleado
              </Link>
            </div>
          </div>

          {showSuccess && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              ¡Empleados agregados exitosamente!
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Search and Filter Section */}
          {employees.length > 0 && (
            <div className="mb-6 bg-white shadow rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 mr-4">
                  {/* Search Bar */}
                  <div className="md:col-span-2">
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                    Buscar
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      ref={searchInputRef}
                      type="text"
                      id="search"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onFocus={handleSearchFocus}
                      onBlur={handleSearchBlur}
                      placeholder="Buscar por nombre, email o DNI..."
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                {/* Role Filter Dropdown */}
                <div>
                  <label htmlFor="roleFilter" className="block text-sm font-medium text-gray-700 mb-1">
                    Filtrar por Rol
                  </label>
                  <select
                    id="roleFilter"
                    value={roleFilter}
                    onChange={handleRoleFilterChange}
                    className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="all">Todos los roles</option>
                    <option value="Admin">Administrador</option>
                    <option value="HR_Staff">Personal de RRHH</option>
                    <option value="Management">Gerencia</option>
                    <option value="employee">Empleado</option>
                  </select>
                </div>
                </div>
                
                {/* Column Visibility Toggle */}
                <div className="flex-shrink-0">
                  <ColumnVisibilityToggle
                    tableId="employees-table"
                    columns={tableColumns}
                    onVisibilityChange={setColumnVisibility}
                  />
                </div>
              </div>

              {/* Active Filters Display */}
              {(debouncedSearchQuery || roleFilter !== 'all' || sortField) && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Filtros activos:</span>
                  
                  {debouncedSearchQuery && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      Búsqueda: "{debouncedSearchQuery}"
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setDebouncedSearchQuery('');
                        }}
                        className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-indigo-200"
                        aria-label="Remove search filter"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  
                  {roleFilter !== 'all' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      Rol: {getRoleDisplayName(roleFilter)}
                      <button
                        onClick={() => setRoleFilter('all')}
                        className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-indigo-200"
                        aria-label="Remove role filter"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  
                  {sortField && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      Ordenado por: {
                        sortField === 'name' ? 'Nombre' : 
                        sortField === 'startDate' ? 'Fecha de Inicio' : 
                        sortField === 'email' ? 'Email' :
                        sortField === 'role' ? 'Rol' :
                        sortField
                      } ({sortDirection === 'asc' ? '↑' : '↓'})
                      <button
                        onClick={() => {
                          setSortField(null);
                          setSortDirection('asc');
                        }}
                        className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-indigo-200"
                        aria-label="Remove sort"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  
                  <button
                    onClick={clearFilters}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Limpiar todo
                  </button>
                </div>
              )}

              {/* Results count */}
              <div className="mt-3 text-sm text-gray-600">
                {pagination ? (
                  <>
                    Mostrando{' '}
                    <span className="font-medium">
                      {pagination.currentPage === 1 ? 1 : (pagination.currentPage - 1) * pagination.pageSize + 1}
                    </span>{' '}
                    a{' '}
                    <span className="font-medium">
                      {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)}
                    </span>{' '}
                    de <span className="font-medium">{pagination.totalCount}</span> resultado{pagination.totalCount !== 1 ? 's' : ''}
                    {(searchQuery.trim() || roleFilter !== 'all') && ' (filtrado)'}
                  </>
                ) : (
                  <>
                    Mostrando {employees.length} empleado{employees.length !== 1 ? 's' : ''}
                  </>
                )}
              </div>
            </div>
          )}

          {employees.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <p className="text-gray-500">No hay empleados registrados aún.</p>
              <Link
                href="/register"
                className="mt-4 inline-flex items-center text-indigo-600 hover:text-indigo-500"
              >
                Agregar el primer empleado →
              </Link>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {/* Sortable Name column */}
                      {columnVisibility.name !== false && (
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Nombre Completo</span>
                            {sortField === 'name' && (
                              <span className="text-indigo-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                      )}
                      {columnVisibility.dni !== false && (
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          DNI
                        </th>
                      )}
                      {columnVisibility.rtn !== false && (
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          RTN
                        </th>
                      )}
                      {columnVisibility.phoneNumber !== false && (
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Teléfono
                        </th>
                      )}
                      {columnVisibility.address !== false && (
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dirección
                        </th>
                      )}
                      {/* Sortable Start Date column */}
                      {columnVisibility.startDate !== false && (
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('startDate')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Fecha de Inicio</span>
                            {sortField === 'startDate' && (
                              <span className="text-indigo-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                      )}
                      {/* Sortable Email column */}
                      {columnVisibility.email !== false && (
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('email')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Email</span>
                            {sortField === 'email' && (
                              <span className="text-indigo-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                      )}
                      {columnVisibility.position !== false && (
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cargo/Puesto
                        </th>
                      )}
                      {/* Sortable Role column */}
                      {columnVisibility.role !== false && (
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort('role')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Rol</span>
                            {sortField === 'role' && (
                              <span className="text-indigo-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                      )}
                      {columnVisibility.reportsTo !== false && (
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Manager
                        </th>
                      )}
                      {columnVisibility.actions !== false && (
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employees.length === 0 ? (
                      <tr>
                        <td 
                          colSpan={Object.values(columnVisibility).filter(Boolean).length || 11} 
                          className="px-6 py-8 text-center text-sm text-gray-500"
                        >
                          {loading ? 'Cargando...' : 'No se encontraron empleados que coincidan con los filtros aplicados.'}
                        </td>
                      </tr>
                    ) : (
                      employees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        {columnVisibility.name !== false && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {employee.name || 'N/A'}
                          </td>
                        )}
                        {columnVisibility.dni !== false && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDNIForDisplay(employee.dni)}
                          </td>
                        )}
                        {columnVisibility.rtn !== false && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatRTNForDisplay(employee.rtn)}
                          </td>
                        )}
                        {columnVisibility.phoneNumber !== false && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatPhoneForDisplay(employee.phoneNumber)}
                          </td>
                        )}
                        {columnVisibility.address !== false && (
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="max-w-xs truncate" title={employee.address || ''}>
                              {employee.address || 'N/A'}
                            </div>
                          </td>
                        )}
                        {columnVisibility.startDate !== false && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(employee.startDate)}
                          </td>
                        )}
                        {columnVisibility.email !== false && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {employee.email}
                          </td>
                        )}
                        {columnVisibility.position !== false && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {employee.position || 'N/A'}
                          </td>
                        )}
                        {columnVisibility.role !== false && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {employee.role ? getRoleDisplayName(employee.role) : 'N/A'}
                          </td>
                        )}
                        {columnVisibility.reportsTo !== false && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {employee.reportsTo ? (
                              <div>
                                <div className="font-medium text-gray-900">
                                  {employee.reportsTo.name || 'N/A'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {employee.reportsTo.email}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">Sin manager</span>
                            )}
                          </td>
                        )}
                        {columnVisibility.actions !== false && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {canEditEmployee(employee) ? (
                              <Link
                                href={`/employees/${employee.id}/edit`}
                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                              >
                                Editar
                              </Link>
                            ) : (
                              <span className="text-gray-400">Sin permiso</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {pagination && pagination.totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  {/* Mobile view - Simple Previous/Next */}
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={handlePrevious}
                      disabled={!pagination.hasPreviousPage || loading}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                        pagination.hasPreviousPage && !loading
                          ? 'bg-white text-gray-700 hover:bg-gray-50'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Anterior
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={!pagination.hasNextPage || loading}
                      className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                        pagination.hasNextPage && !loading
                          ? 'bg-white text-gray-700 hover:bg-gray-50'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Siguiente
                    </button>
                  </div>

                  {/* Desktop view - Full pagination with page numbers */}
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Mostrando{' '}
                        <span className="font-medium">
                          {pagination.currentPage === 1 ? 1 : (pagination.currentPage - 1) * pagination.pageSize + 1}
                        </span>{' '}
                        a{' '}
                        <span className="font-medium">
                          {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)}
                        </span>{' '}
                        de <span className="font-medium">{pagination.totalCount}</span> resultados
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        {/* Previous button */}
                        <button
                          onClick={handlePrevious}
                          disabled={!pagination.hasPreviousPage || loading}
                          className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                            pagination.hasPreviousPage && !loading
                              ? 'bg-white text-gray-500 hover:bg-gray-50'
                              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          <span className="sr-only">Anterior</span>
                          ← Anterior
                        </button>

                        {/* Page numbers */}
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => {
                          // Show first page, last page, current page, and pages around current
                          const showPage =
                            pageNum === 1 ||
                            pageNum === pagination.totalPages ||
                            (pageNum >= pagination.currentPage - 1 && pageNum <= pagination.currentPage + 1);

                          if (!showPage) {
                            // Show ellipsis for gaps
                            if (
                              pageNum === pagination.currentPage - 2 ||
                              pageNum === pagination.currentPage + 2
                            ) {
                              return (
                                <span
                                  key={pageNum}
                                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                                >
                                  ...
                                </span>
                              );
                            }
                            return null;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              disabled={loading}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                pageNum === pagination.currentPage
                                  ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        {/* Next button */}
                        <button
                          onClick={handleNext}
                          disabled={!pagination.hasNextPage || loading}
                          className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                            pagination.hasNextPage && !loading
                              ? 'bg-white text-gray-500 hover:bg-gray-50'
                              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          <span className="sr-only">Siguiente</span>
                          Siguiente →
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
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

export default function EmployeesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <EmployeesList />
    </Suspense>
  );
}


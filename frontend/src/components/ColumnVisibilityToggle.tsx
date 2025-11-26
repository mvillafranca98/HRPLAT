'use client';

import { useState, useEffect } from 'react';
import { getColumnVisibility, saveColumnVisibility, resetColumnVisibility } from '@/lib/columnVisibility';

interface Column {
  key: string;
  label: string;
}

interface ColumnVisibilityToggleProps {
  tableId: string;
  columns: Column[];
  onVisibilityChange?: (visibility: Record<string, boolean>) => void;
}

export default function ColumnVisibilityToggle({
  tableId,
  columns,
  onVisibilityChange,
}: ColumnVisibilityToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() =>
    getColumnVisibility(tableId, columns.map(col => col.key))
  );

  // Load preferences on mount
  useEffect(() => {
    const savedVisibility = getColumnVisibility(
      tableId,
      columns.map(col => col.key)
    );
    setVisibility(savedVisibility);
  }, [tableId, columns]);

  // Notify parent of changes
  useEffect(() => {
    if (onVisibilityChange) {
      onVisibilityChange(visibility);
    }
  }, [visibility, onVisibilityChange]);

  const handleToggle = (columnKey: string) => {
    const newVisibility = {
      ...visibility,
      [columnKey]: !visibility[columnKey],
    };
    setVisibility(newVisibility);
    saveColumnVisibility(tableId, newVisibility);
  };

  const handleReset = () => {
    const defaultVisibility = columns.reduce(
      (acc, col) => ({ ...acc, [col.key]: true }),
      {}
    );
    setVisibility(defaultVisibility);
    resetColumnVisibility(tableId, columns.map(col => col.key));
  };

  const visibleCount = Object.values(visibility).filter(Boolean).length;
  const totalCount = columns.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        aria-label="Toggle column visibility"
      >
        <svg
          className="h-5 w-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        Columnas ({visibleCount}/{totalCount})
        <svg
          className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1">
              <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">
                  Mostrar/Ocultar Columnas
                </h3>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Resetear
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {columns.map((column) => (
                  <label
                    key={column.key}
                    className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={visibility[column.key] ?? true}
                      onChange={() => handleToggle(column.key)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-700">
                      {column.label}
                    </span>
                  </label>
                ))}
              </div>
              
              <div className="px-4 py-2 border-t border-gray-200 text-xs text-gray-500">
                Las preferencias se guardan automáticamente
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


'use client';

import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectDropdownProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  className?: string;
}

const SelectDropdown: React.FC<SelectDropdownProps> = ({
  options,
  className = '',
  ...props
}) => {
  return (
    <select
      className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${className}`}
      style={{
        backgroundColor: '#ffffff', // Always white
        color: '#111827', // Always dark gray-900
        // Override any CSS variables or dark mode styles
      }}
      {...props}
    >
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          style={{
            backgroundColor: '#ffffff', // White background for options
            color: '#111827', // Dark text for options
          }}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default SelectDropdown;


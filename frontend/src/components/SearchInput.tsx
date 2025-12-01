'use client';

import React, { forwardRef } from 'react';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // All standard input props are accepted via ...props
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="text"
        className={`block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${className}`}
        style={{
          backgroundColor: '#ffffff', // Always white
          color: '#111827', // Always dark gray-900
          // Override any CSS variables or dark mode styles
        }}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

export default SearchInput;


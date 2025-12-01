# Form Validation & Input Masks Implementation Guide

This guide explains how to use the validation and input mask utilities that have been created for the HR Platform.

## 📋 Table of Contents

1. [Available Utilities](#available-utilities)
2. [Input Masks](#input-masks)
3. [Validation Rules](#validation-rules)
4. [Column Visibility](#column-visibility)
5. [Implementation Examples](#implementation-examples)

## 📦 Available Utilities

### Files Created:

1. **`/lib/inputMasks.ts`** - Input formatting functions
2. **`/lib/validation.ts`** - Validation functions
3. **`/lib/columnVisibility.ts`** - Column visibility persistence
4. **`/components/ColumnVisibilityToggle.tsx`** - Reusable column toggle component

## 🎭 Input Masks

### Available Mask Functions:

#### Phone Number Mask
```typescript
import { maskPhoneNumber, unmask } from '@/lib/inputMasks';

// Formats to: XXXX-XXXX (Honduras format)
const formatted = maskPhoneNumber('98765432');
// Result: "9876-5432"

// To get raw value for storage
const raw = unmask(formatted);
// Result: "98765432"
```

#### DNI Mask
```typescript
import { maskDNI, unmask } from '@/lib/inputMasks';

// Formats to: XXXX-XXXX-XXXXX (13 digits)
const formatted = maskDNI('0801199012345');
// Result: "0801-1990-12345"
```

#### RTN Mask
```typescript
import { maskRTN, unmask } from '@/lib/inputMasks';

// Formats to: XXXX-XXXX-XXXXXX (14 digits)
const formatted = maskRTN('08011990123456');
// Result: "0801-1990-123456"
```

#### Email Formatting
```typescript
import { formatEmail } from '@/lib/inputMasks';

// Converts to lowercase and trims
const formatted = formatEmail('  John@EXAMPLE.com  ');
// Result: "john@example.com"
```

### Usage in Forms:

```typescript
import { maskPhoneNumber, maskDNI, maskRTN, unmask } from '@/lib/inputMasks';

// In your component
const [phoneNumber, setPhoneNumber] = useState('');

// Handle input change
const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const rawValue = e.target.value;
  const masked = maskPhoneNumber(rawValue);
  setPhoneNumber(masked);
};

// When submitting, use unmask to get raw value
const handleSubmit = () => {
  const rawPhone = unmask(phoneNumber);
  // Send rawPhone to API
};
```

## ✅ Validation Rules

### Available Validation Functions:

All validation functions return `{ isValid: boolean, error?: string }`

#### Email Validation
```typescript
import { validateEmail } from '@/lib/validation';

const result = validateEmail('test@example.com');
if (!result.isValid) {
  console.error(result.error); // "El formato del email no es válido"
}
```

#### Phone Validation
```typescript
import { validatePhoneNumber } from '@/lib/validation';

const result = validatePhoneNumber('9876-5432');
if (!result.isValid) {
  console.error(result.error); // "El teléfono debe tener 8 dígitos"
}
```

#### DNI Validation
```typescript
import { validateDNI } from '@/lib/validation';

// Required field
const result = validateDNI('0801-1990-12345', true);
if (!result.isValid) {
  console.error(result.error);
}

// Optional field
const result2 = validateDNI('', false); // Returns { isValid: true }
```

#### RTN Validation
```typescript
import { validateRTN } from '@/lib/validation';

const result = validateRTN('0801-1990-123456', true);
```

#### Required Field Validation
```typescript
import { validateRequired } from '@/lib/validation';

const result = validateRequired(formData.name, 'Nombre');
if (!result.isValid) {
  console.error(result.error); // "Nombre es requerido"
}
```

#### Password Validation
```typescript
import { validatePassword } from '@/lib/validation';

const result = validatePassword('password123', 6);
```

### Real-time Validation Example:

```typescript
import { useState } from 'react';
import { validateEmail, validatePhoneNumber } from '@/lib/validation';

function MyForm() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // Validate on change (only show error after blur or if already invalid)
    const validation = validateEmail(value);
    if (!validation.isValid && value.length > 0) {
      setEmailError(validation.error || '');
    } else {
      setEmailError('');
    }
  };

  const handleEmailBlur = () => {
    const validation = validateEmail(email);
    if (!validation.isValid) {
      setEmailError(validation.error || '');
    }
  };

  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={handleEmailChange}
        onBlur={handleEmailBlur}
        className={emailError ? 'border-red-500' : ''}
      />
      {emailError && (
        <p className="text-red-500 text-sm mt-1">{emailError}</p>
      )}
    </div>
  );
}
```

## 👁️ Column Visibility

### Using Column Visibility in Tables:

#### 1. Import the Component
```typescript
import ColumnVisibilityToggle from '@/components/ColumnVisibilityToggle';
import { getColumnVisibility } from '@/lib/columnVisibility';
```

#### 2. Define Your Columns
```typescript
const tableColumns = [
  { key: 'name', label: 'Nombre Completo' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Teléfono' },
  // ... more columns
];
```

#### 3. Initialize Visibility State
```typescript
const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() =>
  getColumnVisibility('my-table-id', tableColumns.map(col => col.key))
);
```

#### 4. Add Toggle Component to UI
```typescript
<ColumnVisibilityToggle
  tableId="my-table-id"
  columns={tableColumns}
  onVisibilityChange={setColumnVisibility}
/>
```

#### 5. Conditionally Render Columns
```typescript
{columnVisibility.name !== false && (
  <th>Nombre</th>
)}

// In table body
{columnVisibility.name !== false && (
  <td>{employee.name}</td>
)}
```

### Features:

- ✅ Automatically saves preferences to localStorage
- ✅ Persists across page refreshes
- ✅ Reset to default functionality
- ✅ Shows count of visible columns

## 🔧 Complete Form Example

Here's a complete example combining masks and validation:

```typescript
'use client';

import { useState } from 'react';
import { maskPhoneNumber, maskDNI, maskRTN, unmask, formatEmail } from '@/lib/inputMasks';
import { 
  validateEmail, 
  validatePhoneNumber, 
  validateDNI, 
  validateRTN,
  validateRequired 
} from '@/lib/validation';

export default function EmployeeForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dni: '',
    rtn: '',
    phoneNumber: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, name: value });
    
    // Clear error when user starts typing
    if (errors.name) {
      setErrors({ ...errors, name: '' });
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = formatEmail(e.target.value);
    setFormData({ ...formData, email: value });
    
    // Real-time validation
    if (value && errors.email) {
      const validation = validateEmail(value);
      setErrors({ 
        ...errors, 
        email: validation.isValid ? '' : (validation.error || '')
      });
    }
  };

  const handleEmailBlur = () => {
    const validation = validateEmail(formData.email);
    if (!validation.isValid) {
      setErrors({ ...errors, email: validation.error || '' });
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskPhoneNumber(e.target.value);
    setFormData({ ...formData, phoneNumber: masked });
  };

  const handlePhoneBlur = () => {
    const validation = validatePhoneNumber(formData.phoneNumber);
    if (!validation.isValid) {
      setErrors({ ...errors, phoneNumber: validation.error || '' });
    }
  };

  const handleDNIChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskDNI(e.target.value);
    setFormData({ ...formData, dni: masked });
  };

  const handleDNIBlur = () => {
    const validation = validateDNI(formData.dni, true);
    if (!validation.isValid) {
      setErrors({ ...errors, dni: validation.error || '' });
    }
  };

  const handleRTNChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskRTN(e.target.value);
    setFormData({ ...formData, rtn: masked });
  };

  const handleRTNBlur = () => {
    const validation = validateRTN(formData.rtn, false); // Optional
    if (!validation.isValid && formData.rtn) {
      setErrors({ ...errors, rtn: validation.error || '' });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate all fields
    const nameValidation = validateRequired(formData.name, 'Nombre');
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.error || '';
    }

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error || '';
    }

    const phoneValidation = validatePhoneNumber(formData.phoneNumber);
    if (!phoneValidation.isValid) {
      newErrors.phoneNumber = phoneValidation.error || '';
    }

    const dniValidation = validateDNI(formData.dni, true);
    if (!dniValidation.isValid) {
      newErrors.dni = dniValidation.error || '';
    }

    const rtnValidation = validateRTN(formData.rtn, false);
    if (!rtnValidation.isValid && formData.rtn) {
      newErrors.rtn = rtnValidation.error || '';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Prepare data for API (unmask values)
    const apiData = {
      name: formData.name,
      email: formData.email,
      phoneNumber: unmask(formData.phoneNumber),
      dni: unmask(formData.dni),
      rtn: unmask(formData.rtn),
    };

    // Submit to API
    // ...
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Nombre *</label>
        <input
          type="text"
          value={formData.name}
          onChange={handleNameChange}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <label>Email *</label>
        <input
          type="email"
          value={formData.email}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email}</p>
        )}
      </div>

      <div>
        <label>Teléfono *</label>
        <input
          type="text"
          value={formData.phoneNumber}
          onChange={handlePhoneChange}
          onBlur={handlePhoneBlur}
          placeholder="9876-5432"
          maxLength={9} // XXXX-XXXX = 9 chars
          className={errors.phoneNumber ? 'border-red-500' : ''}
        />
        {errors.phoneNumber && (
          <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>
        )}
      </div>

      <div>
        <label>DNI *</label>
        <input
          type="text"
          value={formData.dni}
          onChange={handleDNIChange}
          onBlur={handleDNIBlur}
          placeholder="0801-1990-12345"
          maxLength={15} // XXXX-XXXX-XXXXX = 15 chars
          className={errors.dni ? 'border-red-500' : ''}
        />
        {errors.dni && (
          <p className="text-red-500 text-sm mt-1">{errors.dni}</p>
        )}
      </div>

      <div>
        <label>RTN</label>
        <input
          type="text"
          value={formData.rtn}
          onChange={handleRTNChange}
          onBlur={handleRTNBlur}
          placeholder="0801-1990-123456"
          maxLength={16} // XXXX-XXXX-XXXXXX = 16 chars
          className={errors.rtn ? 'border-red-500' : ''}
        />
        {errors.rtn && (
          <p className="text-red-500 text-sm mt-1">{errors.rtn}</p>
        )}
      </div>

      <button type="submit">Guardar</button>
    </form>
  );
}
```

## 📝 Summary

### Step-by-Step Implementation:

1. **Import utilities** at the top of your form component
2. **Add state** for form data and errors
3. **Create handlers** for each input (apply masks, validate)
4. **Add validation** on blur or submit
5. **Display errors** below inputs
6. **Unmask values** before submitting to API

### Best Practices:

- ✅ Show validation errors on blur (not while typing)
- ✅ Apply masks immediately as user types
- ✅ Clear errors when user starts correcting
- ✅ Always unmask values before sending to API
- ✅ Use localStorage for column preferences
- ✅ Provide visual feedback (red borders, error messages)

## 🎯 Next Steps

To apply this to your forms:

1. Update `/app/employees/[id]/edit/page.tsx`
2. Update `/app/register/page.tsx`
3. Update `/app/change-password/page.tsx`
4. Apply to any other forms as needed

The column visibility is already implemented in `/app/employees/page.tsx`!


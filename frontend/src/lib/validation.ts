/**
 * Validation Utilities
 * Provides functions to validate form inputs
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates an email address
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'El email es requerido' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'El formato del email no es válido' };
  }
  
  return { isValid: true };
}

/**
 * Validates a phone number (Honduras: 8 digits)
 */
export function validatePhoneNumber(phone: string): ValidationResult {
  const digits = phone.replace(/\D/g, '');
  
  if (!digits || digits.length === 0) {
    return { isValid: false, error: 'El teléfono es requerido' };
  }
  
  if (digits.length !== 8) {
    return { isValid: false, error: 'El teléfono debe tener 8 dígitos' };
  }
  
  return { isValid: true };
}

/**
 * Validates a DNI (typically 13 digits)
 */
export function validateDNI(dni: string, required: boolean = false): ValidationResult {
  const digits = dni.replace(/\D/g, '');
  
  if (!digits || digits.length === 0) {
    if (required) {
      return { isValid: false, error: 'El DNI es requerido' };
    }
    return { isValid: true }; // Optional field
  }
  
  if (digits.length !== 13) {
    return { isValid: false, error: 'El DNI debe tener 13 dígitos' };
  }
  
  return { isValid: true };
}

/**
 * Validates an RTN (typically 14 digits)
 */
export function validateRTN(rtn: string, required: boolean = false): ValidationResult {
  const digits = rtn.replace(/\D/g, '');
  
  if (!digits || digits.length === 0) {
    if (required) {
      return { isValid: false, error: 'El RTN es requerido' };
    }
    return { isValid: true }; // Optional field
  }
  
  if (digits.length !== 14) {
    return { isValid: false, error: 'El RTN debe tener 14 dígitos' };
  }
  
  return { isValid: true };
}

/**
 * Validates a required text field
 */
export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${fieldName} es requerido` };
  }
  
  return { isValid: true };
}

/**
 * Validates password strength
 */
export function validatePassword(password: string, minLength: number = 6): ValidationResult {
  if (!password || password.length === 0) {
    return { isValid: false, error: 'La contraseña es requerida' };
  }
  
  if (password.length < minLength) {
    return { isValid: false, error: `La contraseña debe tener al menos ${minLength} caracteres` };
  }
  
  return { isValid: true };
}

/**
 * Validates date is not in the future
 */
export function validateDateNotFuture(dateString: string): ValidationResult {
  if (!dateString) {
    return { isValid: true }; // Optional
  }
  
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  if (date > today) {
    return { isValid: false, error: 'La fecha no puede ser futura' };
  }
  
  return { isValid: true };
}


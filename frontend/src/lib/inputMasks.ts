/**
 * Input Mask Utilities
 * Provides functions to format and validate input values with masks
 */

/**
 * Extracts area code and phone number from a phone string
 * Handles formats like: +50498765432, 50498765432, +504 98765432, etc.
 * @param phoneString - Full phone string that may include area code
 * @returns Object with areaCode and phoneNumber
 */
export function parsePhoneWithAreaCode(phoneString: string | null): { areaCode: string; phoneNumber: string } {
  if (!phoneString) return { areaCode: '', phoneNumber: '' };
  
  // Remove all non-digit characters except +
  const cleaned = phoneString.replace(/[^\d+]/g, '');
  
  // Check for area codes: +504, 504, or just phone number
  if (cleaned.startsWith('+504')) {
    return {
      areaCode: '+504',
      phoneNumber: cleaned.slice(4).slice(0, 8) // Take next 8 digits
    };
  } else if (cleaned.startsWith('504') && cleaned.length > 11) {
    return {
      areaCode: '+504',
      phoneNumber: cleaned.slice(3).slice(0, 8) // Take next 8 digits
    };
  } else if (cleaned.length === 8) {
    // Just phone number, no area code
    return {
      areaCode: '+504',
      phoneNumber: cleaned
    };
  } else if (cleaned.length > 8) {
    // Assume first 3 digits are area code (504)
    return {
      areaCode: '+504',
      phoneNumber: cleaned.slice(-8) // Take last 8 digits
    };
  }
  
  return {
    areaCode: '+504',
    phoneNumber: cleaned.slice(0, 8)
  };
}

/**
 * Formats a phone number input (Honduras format: 9999-9999)
 * @param value - Raw input value (can be already formatted or raw)
 * @returns Formatted phone number (without area code)
 */
export function maskPhoneNumber(value: string): string {
  if (!value) return '';
  
  // Remove all non-digit characters to get raw value
  const digits = value.replace(/\D/g, '');
  
  // If no digits, return empty
  if (!digits) return '';
  
  // Limit to 8 digits
  const limited = digits.slice(0, 8);
  
  // Format: XXXX-XXXX
  if (limited.length <= 4) {
    return limited;
  }
  return `${limited.slice(0, 4)}-${limited.slice(4)}`;
}

/**
 * Formats phone number with area code for display
 * @param areaCode - Area code (e.g., +504)
 * @param phoneNumber - Phone number (formatted or raw)
 * @returns Formatted string like "+504 9876-5432"
 */
export function formatPhoneWithAreaCode(areaCode: string, phoneNumber: string | null): string {
  if (!phoneNumber) return '';
  
  const formatted = maskPhoneNumber(phoneNumber);
  const code = areaCode || '+504';
  return `${code} ${formatted}`;
}

/**
 * Combines area code and phone number for storage
 * @param areaCode - Area code
 * @param phoneNumber - Phone number (will be unmasked)
 * @returns Combined string for storage
 */
export function combinePhoneWithAreaCode(areaCode: string, phoneNumber: string): string {
  const unmasked = unmask(phoneNumber);
  const code = areaCode || '+504';
  return `${code} ${unmasked}`;
}

/**
 * Formats a DNI input (typically 13 digits)
 * @param value - Raw input value (can be already formatted or raw)
 * @returns Formatted DNI (XXXX-XXXX-XXXXX)
 */
export function maskDNI(value: string): string {
  if (!value) return '';
  
  // Remove all non-digit characters to get raw value
  const digits = value.replace(/\D/g, '');
  
  // If no digits, return empty
  if (!digits) return '';
  
  const limited = digits.slice(0, 13);
  
  if (limited.length <= 4) {
    return limited;
  } else if (limited.length <= 8) {
    return `${limited.slice(0, 4)}-${limited.slice(4)}`;
  }
  return `${limited.slice(0, 4)}-${limited.slice(4, 8)}-${limited.slice(8)}`;
}

/**
 * Formats an RTN input (typically 14 digits)
 * @param value - Raw input value (can be already formatted or raw)
 * @returns Formatted RTN (XXXX-XXXX-XXXXXX)
 */
export function maskRTN(value: string): string {
  if (!value) return '';
  
  // Remove all non-digit characters to get raw value
  const digits = value.replace(/\D/g, '');
  
  // If no digits, return empty
  if (!digits) return '';
  
  const limited = digits.slice(0, 14);
  
  if (limited.length <= 4) {
    return limited;
  } else if (limited.length <= 8) {
    return `${limited.slice(0, 4)}-${limited.slice(4)}`;
  }
  return `${limited.slice(0, 4)}-${limited.slice(4, 8)}-${limited.slice(8)}`;
}

/**
 * Removes mask formatting from a value, returning only digits
 * @param value - Masked value
 * @returns Raw numeric string
 */
export function unmask(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Formats an email input (basic validation, no mask but ensures lowercase)
 * @param value - Raw input value
 * @returns Lowercased email
 */
export function formatEmail(value: string): string {
  return value.toLowerCase().trim();
}


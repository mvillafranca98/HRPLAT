# Severance Calculations File Structure

## Overview

The severance calculation functions have been split into two files to protect working code while allowing fixes to problematic functions.

## File Structure

### 1. `severanceFormCalculationsWorking.ts` (PROTECTED - DO NOT MODIFY)

**Location:** `frontend/src/lib/severanceFormCalculationsWorking.ts`

**Purpose:** Contains all working calculations that are functioning correctly.

**Contains:**
- ✅ `calculateRequiredPreavisoDays` - Preaviso days calculation (working)
- ✅ `calculateTerminationDateFromPreaviso` - Termination date calculation (working)
- ✅ `calculatePreavisoDays` - Preaviso days from termination date (working)
- ✅ `calculateCesantiaDays` - Cesantia days (not proportional) (working)
- ✅ `calculateThirteenthMonthDays` - 13th month calculation (working)
- ✅ `calculateFourteenthMonthDays` - 14th month calculation (working)
- ✅ `getJanuary1stOfTerminationYear` - Date helper (working)
- ✅ `getLastJanuary1st` - Date helper (working)
- ✅ `getJuly1stOfTerminationYear` - Date helper (working)
- ✅ `getLastJuly1st` - Date helper (working)
- ✅ `getJanuary1stOfYear` - Date helper alias (working)
- ✅ `calculateProportionalVacationDaysForm` - Alternative form calculation (working)

**Note:** This file imports shared utilities from `severanceFormCalculations.ts`:
- `calculateServicePeriod` - Shared utility for period calculations
- `formatDateForInput` - Shared utility for date formatting

---

### 2. `severanceFormCalculations.ts` (MODIFY HERE)

**Location:** `frontend/src/lib/severanceFormCalculations.ts`

**Purpose:** Contains functions that need fixing and shared utilities.

**Contains:**
- ❌ `calculateCesantiaProportionalDays` - **NEEDS FIXING**
- ❌ `calculateVacationProportionalDays` - **NEEDS FIXING**
- 🔧 `calculateServicePeriod` - Shared utility (used by both files)
- 🔧 `getLastAnniversaryDate` - Shared utility (used by both files)
- 🔧 `formatDateForInput` - Shared utility (used by both files)

**Modify Only:**
- These are the only functions you should modify when fixing the proportional calculations.

---

## Usage in `page.tsx`

The `page.tsx` file imports from both files:

```typescript
// Import working calculations (do not modify these)
import {
  calculatePreavisoDays,
  calculateRequiredPreavisoDays,
  calculateTerminationDateFromPreaviso,
  calculateCesantiaDays,
  getLastJanuary1st,
  calculateThirteenthMonthDays,
  getJanuary1stOfTerminationYear,
  getLastJuly1st,
  calculateFourteenthMonthDays,
  getJuly1stOfTerminationYear,
  formatDateForInput,
} from '@/lib/severanceFormCalculationsWorking';

// Import problematic calculations (these need to be fixed)
import {
  calculateVacationProportionalDays,
  calculateCesantiaProportionalDays,
} from '@/lib/severanceFormCalculations';
```

---

## What to Modify

### ✅ Safe to Modify (in `severanceFormCalculations.ts`):

1. **`calculateCesantiaProportionalDays`**
   - **Expected:** Should calculate 27.17 days for the example case
   - **Current Issue:** Calculation doesn't match spreadsheet (31,698.33 vs 31,694.44)
   - **Location:** Lines 50-95

2. **`calculateVacationProportionalDays`**
   - **Expected:** Should calculate 10.87 days for the example case
   - **Current Issue:** Calculation shows 9.06 days instead of 10.87 days
   - **Location:** Lines 97-138

### ❌ Do NOT Modify (in `severanceFormCalculationsWorking.ts`):

- All other functions are working correctly and should not be changed.
- If you need to change working functions, move them to the original file first.

---

## Shared Utilities

These utilities are in `severanceFormCalculations.ts` and can be used by both files:

- **`calculateServicePeriod`**: Calculates years, months, days between two dates using 30-day months
- **`getLastAnniversaryDate`**: Gets the last anniversary date before a given date
- **`formatDateForInput`**: Formats a Date object as YYYY-MM-DD string

---

## Example Fix Workflow

1. Open `frontend/src/lib/severanceFormCalculations.ts`
2. Find the function you want to fix (e.g., `calculateVacationProportionalDays`)
3. Make your changes
4. Test the results
5. The working calculations remain untouched in `severanceFormCalculationsWorking.ts`

---

## Notes

- The working file is protected from accidental changes
- Only the two problematic functions need to be fixed
- Shared utilities are available to both files
- All imports have been updated correctly


# Severance Calculation Formulas - Location Reference

This document explains where each calculation formula is located in the codebase and what it should calculate.

## File Locations

### Main Calculation Functions
**File:** `frontend/src/lib/severanceFormCalculations.ts`

### PDF Generation
**File:** `frontend/src/lib/severancePdfGeneratorForm.ts`

### Form Auto-Calculation
**File:** `frontend/src/app/severance/calculator/page.tsx`

---

## Formula Breakdown

### 1. **Preaviso Days** (Notice Period)
**Location:** `frontend/src/lib/severanceFormCalculations.ts` - Line 54-96
**Function:** `calculateRequiredPreavisoDays(startDate)`
**Rules:**
- 3-6 months: 7 days
- 6-12 months: 14 days  
- 1-2 years: 30 days
- 2-5 years: 60 days
- 5-10 years: 90 days
- 10+ years: 120 days

**Termination Date Calculation:**
**Location:** Line 101-109
**Function:** `calculateTerminationDateFromPreaviso(preavisoDays)`
**Formula:** `today + preavisoDays`

---

### 2. **Vacaciones Proporcionales** (Proportional Vacation Days)
**Location:** `frontend/src/lib/severanceFormCalculations.ts` - Line 517-538
**Function:** `calculateVacationProportionalDays(startDate, terminationDate, vacationDaysEntitlement)`
**Formula:** 
```
days = days from last anniversary to termination date (using 30-day months)
result = (days / 360) * vacationDaysEntitlement
```

**Example for Jan 6, 2026 termination:**
- Last anniversary: Feb 10, 2025
- Days from Feb 10, 2025 to Jan 6, 2026 using 30-day months = 326 days
- Formula: (326 / 360) * 12 = 10.87 days

**PDF Conversion:** 
**Location:** `frontend/src/lib/severancePdfGeneratorForm.ts` - Line 279-280
```
vacationProDays = formData.vacationProportionalDays (already calculated above)
vacationProPay = vacationProDays * promDaily
```

---

### 3. **Auxilio de Cesantía Proporcional** (Proportional Severance)
**Location:** `frontend/src/lib/severanceFormCalculations.ts` - Line 439-479
**Function:** `calculateCesantiaProportionalDays(startDate, terminationDate)`
**Formula:**
```
daysInLastYear = days from last anniversary to termination (using 30-day months)
result = (daysInLastYear * 30) / 360
```

**Example for Jan 6, 2026 termination:**
- Last anniversary: Feb 10, 2025
- Days from Feb 10, 2025 to Jan 6, 2026 = 326 days
- Formula: (326 * 30) / 360 = 27.17 days

---

### 4. **Décimo Tercer Mes** (13th Month)
**Location:** `frontend/src/lib/severanceFormCalculations.ts` - Line 214-264
**Function:** `calculateThirteenthMonthDays(startDate, terminationDate)`
**Formula:**
```
rawDays = days from last January 1st to termination date (using 30-day months)
```

**Example for Jan 6, 2026 termination:**
- From: Jan 1, 2026
- To: Jan 6, 2026
- Raw days = 6 days (Jan 1, 2, 3, 4, 5, 6)

**PDF Conversion:**
**Location:** `frontend/src/lib/severancePdfGeneratorForm.ts` - Line 283-284
```
thirteenthDays = (rawDays * 30) / 360
thirteenthPay = thirteenthDays * baseDaily
```

**Example:** (6 * 30) / 360 = 0.50 days → 0.50 * 1,000.00 = 500.00

---

### 5. **Décimo Cuarto Mes** (14th Month)
**Location:** `frontend/src/lib/severanceFormCalculations.ts` - Line 312-360
**Function:** `calculateFourteenthMonthDays(startDate, terminationDate)`
**Formula:**
```
rawDays = days from last July 1st to termination date (using 30-day months)
```

**Example for Jan 6, 2026 termination:**
- From: July 1, 2025
- To: Jan 6, 2026
- Raw days = 6 months * 30 + 6 days = 186 days

**PDF Conversion:**
**Location:** `frontend/src/lib/severancePdfGeneratorForm.ts` - Line 287-288
```
fourteenthDays = (rawDays * 30) / 360
fourteenthPay = fourteenthDays * baseDaily
```

**Example:** (186 * 30) / 360 = 15.50 days → 15.50 * 1,000.00 = 15,500.00

---

## Helper Functions

### Service Period Calculation
**Location:** `frontend/src/lib/severanceFormCalculations.ts` - Line 374-413
**Function:** `calculateServicePeriod(startDate, terminationDate)`
**Purpose:** Calculates years, months, days between two dates using 30-day months
**Formula:** 
```
totalDays = (years * 360) + (months * 30) + days
```

### Last Anniversary Date
**Location:** `frontend/src/lib/severanceFormCalculations.ts` - Line 475-510
**Function:** `getLastAnniversaryDate(startDate, beforeDate)`
**Purpose:** Finds the most recent anniversary date on or before the termination date

---

## Key Points

1. **All calculations use 30-day months** for consistency with Honduras labor law
2. **Years = 360 days** (12 months * 30 days)
3. **Days are counted inclusively** (both start and end day included)
4. **The termination date** should be calculated as `today + preavisoDays` when employee is selected
5. **PDF conversion formulas** apply `*30/360` to 13th and 14th month raw days
6. **Vacation proportional** uses `(days/360)*entitlement` formula
7. **Cesantia proportional** uses `(days*30/360)` formula

---

## Troubleshooting

If calculations don't match expected values:

1. **Check termination date**: Should be "today + preaviso days"
2. **Verify last anniversary**: Should be the most recent anniversary on/before termination
3. **Confirm day counting**: All dates use inclusive counting (both start and end day)
4. **Check 30-day month logic**: All months treated as 30 days for calculations
5. **Verify formula application**: PDF applies conversions correctly (`*30/360` for 13th/14th month)

---

## Expected Results (Example: Jan 6, 2026 termination)

- **Vacaciones Proporcionales**: 10.87 days (326 days / 360 * 12)
- **Cesantía Proporcional**: 27.17 days (326 days * 30 / 360)
- **Décimo Tercer Mes**: 0.50 days (6 days * 30 / 360)
- **Décimo Cuarto Mes**: 15.50 days (186 days * 30 / 360)


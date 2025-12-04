# Severance Calculations Reference

This document explains where all the severance calculation formulas are located and how to adjust them.

## ✅ Latest Updates (All Fixes Applied)

All calculation issues have been fixed:
- ✅ **Preaviso Days**: Always calculated from service period (based on start date)
- ✅ **Proportional Vacation Days**: Uses remaining vacation days directly (not calculated)
- ✅ **13th Month Days**: Fixed calculation from last July 1st to termination date
- ✅ **14th Month Days**: Fixed calculation from January 1st to termination date

## 📁 File Locations

### Main Calculation Functions
**File:** `frontend/src/lib/severanceFormCalculations.ts`

This file contains all the core calculation logic:

1. **Preaviso Days Calculation** (Lines 54-96)
   - Function: `calculateRequiredPreavisoDays(startDate)`
   - Rules:
     - 3 to 6 months: 7 days
     - 6 months to 1 year: 14 days
     - 1 to 2 years: 30 days (1 month)
     - 2 to 5 years: 60 days (2 months)
     - 5 to 10 years: 90 days (3 months)
     - 10+ years: 120 days (4 months)

2. **13th Month (Décimo Tercer Mes) Calculation** (Lines 199-240)
   - Function: `calculateThirteenthMonthDays(startDate, terminationDate)`
   - Logic: Calculates days from last July 1st to termination date
   - Uses: 30 days per month calculation

3. **14th Month (Décimo Cuarto Mes) Calculation** (Lines 262-301)
   - Function: `calculateFourteenthMonthDays(startDate, terminationDate)`
   - Logic: Calculates days from January 1st of termination year to termination date
   - Uses: 30 days per month calculation

4. **Termination Date Calculation** (Lines 101-109)
   - Function: `calculateTerminationDateFromPreaviso(preavisoDays)`
   - Logic: Current date + preaviso days

### Form Automation Logic
**File:** `frontend/src/app/severance/calculator/page.tsx`

This file contains the React hooks that trigger calculations:

1. **Auto-calculate when Start Date changes** (Lines 207-224)
   - Calculates required preaviso days based on service period
   - Automatically sets termination date = today + preaviso days

2. **Auto-update Proportional Vacation Days** (Lines 226-232)
   - Sets proportional vacation days = remaining vacation days (direct copy, not calculated)

3. **Auto-calculate when Termination Date changes** (Lines 234-275)
   - Recalculates preaviso days (based on service period)
   - Calculates 13th month days
   - Calculates 14th month days

## 🔧 How to Adjust Formulas

### To Change Preaviso Rules

Edit `calculateRequiredPreavisoDays()` in `severanceFormCalculations.ts`:

```typescript
export function calculateRequiredPreavisoDays(startDate: string | Date): number {
  const servicePeriod = calculateServicePeriodToToday(startDate);
  const totalMonths = servicePeriod.totalMonths;
  
  // Modify these conditions to change the rules
  if (totalMonths >= 3 && totalMonths < 6) {
    return 7; // Change this value
  }
  // ... etc
}
```

### To Change 13th/14th Month Calculation

Edit the respective functions in `severanceFormCalculations.ts`:

- `calculateThirteenthMonthDays()` - Lines 199-240
- `calculateFourteenthMonthDays()` - Lines 262-301

The calculation uses: `(totalMonths * 30) + daysDiff`

To change the "30 days per month" rule, modify this formula.

### To Change Auto-calculation Triggers

Edit the `useEffect` hooks in `page.tsx`:

- **Lines 207-224**: When start date changes
- **Lines 226-232**: When vacation days remaining changes
- **Lines 234-275**: When termination date changes

## 📊 Current Calculation Logic

### Preaviso Days
- **Always** calculated from employee's start date (service period)
- **Not** calculated from termination date
- Based on Honduras labor law requirements

### Proportional Vacation Days
- **Direct copy** of "Días de Vacaciones Restantes" (Remaining Vacation Days)
- **Not** calculated using formula anymore
- Updates automatically when remaining vacation days change

### 13th Month Days
- Counts from **last July 1st** before/on termination date
- Uses **30 days per month** calculation
- Formula: `(months * 30) + remaining_days`

### 14th Month Days
- Counts from **January 1st** of termination year
- Uses **30 days per month** calculation
- Formula: `(months * 30) + remaining_days`

## 🐛 Troubleshooting

If calculations seem incorrect:

1. Check the **start date** - preaviso days are based on service period
2. Check the **termination date** - 13th/14th month calculations depend on this
3. Check **remaining vacation days** - proportional vacation days equals this value
4. Verify the **calculation functions** in `severanceFormCalculations.ts`
5. Check the **useEffect dependencies** in `page.tsx` - missing dependencies can cause stale calculations

## 📝 Notes

- All date calculations use midnight (00:00:00) for accuracy
- Service period is calculated from start date to **today** (current date)
- Termination date is auto-set to **today + preaviso days** when employee is selected
- Users can manually override the termination date if needed


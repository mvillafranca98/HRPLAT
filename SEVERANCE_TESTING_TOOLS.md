# Severance Calculation Testing Tools

This document explains how to use the CLI and UI tools for testing severance calculations.

## 🖥️ CLI Tool

### Location
`frontend/src/scripts/test-severance-calc.ts`

### Usage

#### Interactive Mode (Recommended)
```bash
cd frontend
npm run test:severance
```

This will prompt you for:
- Sueldo Mensual (Monthly Salary)
- Fecha de Ingreso (Start Date) - Format: YYYY-MM-DD
- Fecha de Retiro (Termination Date) - Format: YYYY-MM-DD
- Días de Vacaciones Restantes (Remaining Vacation Days) - Optional

#### Command Line Arguments
```bash
npm run test:severance -- --salary 30000 --start 2024-02-10 --end 2026-01-06 --vacation 10
```

**Arguments:**
- `--salary`, `-s`: Monthly salary in Lempiras
- `--start`: Start date (YYYY-MM-DD)
- `--end`, `--termination`: Termination date (YYYY-MM-DD)
- `--vacation`, `-v`: Remaining vacation days (optional, defaults to 0)

### Example Output

```
═══════════════════════════════════════════════════════════════
           CÁLCULO DE PRESTACIONES LABORALES
═══════════════════════════════════════════════════════════════

Fecha de Ingreso:     10/02/2024
Fecha de Retiro:      06/01/2026
Antigüedad:           1 años 10 meses 26 dias

Sueldo Mensual Ordinario: L. 30,000.00 (L. 1,000.00 diario)
Sueldo Mensual Promedio:  L. 35,000.00 (L. 1,166.67 diario)

═══════════════════════════════════════════════════════════════
                    BENEFICIOS CALCULADOS
═══════════════════════════════════════════════════════════════

Preaviso:
  30.00 días x L. 1,166.67 = L. 35,000.00

Auxilio de Cesantía:
  30.00 días x L. 1,166.67 = L. 35,000.00

Auxilio de Cesantía Proporcional:
  27.17 días x L. 1,166.67 = L. 31,694.44

Vacaciones:
  10.00 días x L. 1,166.67 = L. 11,666.67
  (Entitlement: 12 días)

Vacaciones Proporcionales:
  10.87 días x L. 1,166.67 = L. 12,677.78
  (Desde: 10/02/2025 Hasta: 06/01/2026)

Décimo Tercer Mes:
  0.50 días x L. 1,000.00 = L. 500.00
  (Desde: 01/01/2026 Hasta: 06/01/2026)

Décimo Cuarto Mes:
  15.50 días x L. 1,000.00 = L. 15,500.00
  (Desde: 01/07/2025 Hasta: 06/01/2026)

═══════════════════════════════════════════════════════════════
TOTAL PRESTACIONES:   L. 142,038.89
═══════════════════════════════════════════════════════════════
```

---

## 🖱️ UI Tool (Web Interface)

### Location
`frontend/src/app/test-severance/page.tsx`

### Access

1. Start the development server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Navigate to:
   ```
   http://localhost:3000/test-severance
   ```

### Features

- **Form Inputs:**
  - Sueldo Mensual (Monthly Salary)
  - Fecha de Ingreso (Start Date)
  - Fecha de Retiro (Termination Date)
  - Días de Vacaciones Restantes (Remaining Vacation Days)

- **Results Display:**
  - Employee information (dates, tenure)
  - Salary information (monthly and daily rates)
  - Detailed calculation table with all benefits
  - Total prestaciones
  - Debug section with raw values

- **Benefits Shown:**
  - ✅ Preaviso
  - ✅ Auxilio de Cesantía
  - ✅ Auxilio de Cesantía Proporcional
  - ✅ Vacaciones
  - ✅ Vacaciones Proporcionales
  - ✅ Décimo Tercer Mes
  - ✅ Décimo Cuarto Mes
  - ✅ Total Prestaciones

---

## 📊 What Gets Calculated

Both tools calculate the following:

### 1. **Preaviso**
- Days based on tenure (3-6m: 7, 6-12m: 14, 1-2y: 30, 2-5y: 60, 5-10y: 90, 10+y: 120)
- Payment: `preavisoDays × promDaily`

### 2. **Auxilio de Cesantía**
- Days: `completed years × 30`
- Payment: `cesantiaDays × promDaily`

### 3. **Auxilio de Cesantía Proporcional**
- Days: `(days worked this year × 30) / 360`
- Payment: `cesantiaProportionalDays × promDaily`

### 4. **Vacaciones**
- Uses remaining vacation days input
- Payment: `vacationDaysRemaining × promDaily`

### 5. **Vacaciones Proporcionales**
- Days: `(days since last anniversary / 360) × vacationEntitlement`
- Payment: `vacationProportionalDays × promDaily`

### 6. **Décimo Tercer Mes**
- Raw days from last Jan 1 to termination
- Converted: `(rawDays × 30) / 360`
- Payment: `convertedDays × baseDaily`

### 7. **Décimo Cuarto Mes**
- Raw days from last July 1 to termination
- Converted: `(rawDays × 30) / 360`
- Payment: `convertedDays × baseDaily`

### Salary Calculations
- **promDaily** = `(monthlySalary × 14 / 12) / 30`
- **baseDaily** = `monthlySalary / 30`

---

## 🔧 Testing Specific Cases

### Test Case: Mireya Pineda (Example)
```bash
npm run test:severance -- --salary 30000 --start 2024-02-10 --end 2026-01-06 --vacation 10
```

**Expected Results:**
- Preaviso: 30.00 días = L. 35,000.00
- Auxilio de Cesantía: 30.00 días = L. 35,000.00
- Auxilio de Cesantía Proporcional: 27.17 días = L. 31,694.44
- Vacaciones: 10.00 días = L. 11,666.67
- Vacaciones Proporcionales: 10.87 días = L. 12,677.78
- Décimo Tercer Mes: 0.50 días = L. 500.00
- Décimo Cuarto Mes: 15.50 días = L. 15,500.00
- **Total: L. 142,038.89**

---

## 📝 Notes

- Both tools use the same calculation functions
- Results should match the spreadsheet calculations
- The UI tool provides a more visual, user-friendly interface
- The CLI tool is better for quick calculations and automation
- All dates should be in YYYY-MM-DD format
- Vacation entitlement is automatically calculated based on start date and termination date

---

## 🐛 Troubleshooting

### CLI Tool Issues

**Error: "Cannot find module 'readline'"**
- This is a Node.js built-in module and should work. If not, try using Node.js 18+

**Error: "tsx: command not found"**
- Make sure `tsx` is installed: `npm install`

### UI Tool Issues

**Page not loading**
- Make sure the dev server is running: `npm run dev`
- Check the URL: `http://localhost:3000/test-severance`

**Calculations not matching expected values**
- Check that you're using the correct date format (YYYY-MM-DD)
- Verify the monthly salary is correct
- Check vacation days remaining input
- Review the debug section for raw calculation values

---

## 🔄 Next Steps

1. Use either tool to test your calculations
2. Compare results with your spreadsheet
3. If results don't match, check the calculation functions in:
   - `severanceFormCalculations.ts` (for proportional calculations)
   - `severanceFormCalculationsWorking.ts` (for other calculations)
4. Use the debug section in the UI tool to see raw calculation values


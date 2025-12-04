# Excel Configuration System for Severance Calculator

## 📋 Overview

This system allows you to manage all severance calculation formulas and rules through an Excel file (`severance-config.xlsx`). When you modify the Excel file and save, you can regenerate the TypeScript code automatically.

## 📁 File Locations

- **Excel Configuration**: `severance/severance-config.xlsx`
- **Template Generator**: `frontend/scripts/create-excel-template.ts`
- **Code Generator**: `frontend/scripts/generate-from-excel.ts`
- **Generated Code**: `frontend/src/lib/severanceFormCalculations.generated.ts`

## 🚀 Quick Start

### 1. Create/Update Excel Template

```bash
cd frontend
npm run generate:severance-template
```

This creates/updates the Excel file at `severance/severance-config.xlsx` with all current fields and formulas.

### 2. Edit the Excel File

Open `severance/severance-config.xlsx` in Excel or Google Sheets. The file contains 5 sheets:

#### Sheet 1: Field Definitions
All form fields with their properties:
- Field Name
- Display Label (Spanish)
- Data Type
- Required/Optional
- Auto-Calculated or Manual
- Source/Dependency
- Formula/Logic
- Default Value

#### Sheet 2: Preaviso Rules
Service period to preaviso days mapping:
- Service Period Description
- Min/Max Months
- Min/Max Years
- Preaviso Days
- Notes

**To modify preaviso rules**: Edit the rows in this sheet. For example:
- Change "3 to 6 months" from 7 days to 10 days
- Add new rules for different service periods
- Modify existing ranges

#### Sheet 3: Calculation Formulas
All calculation logic:
- Field Name
- Calculation Type
- Formula/Logic
- Dependencies
- Notes

#### Sheet 4: Field Relationships
How fields are linked to each other:
- Source Field → Target Field
- Relationship Type
- Trigger (when calculation happens)
- Formula

**To understand relationships**: This sheet shows which fields automatically calculate based on others. For example:
- `startDate` → `preavisoDays` (when startDate changes, preavisoDays is calculated)
- `vacationDaysRemaining` → `vacationProportionalDays` (direct copy)

#### Sheet 5: Salary Calculations
Salary formula definitions:
- Calculation Name
- Formula
- Description

### 3. Generate TypeScript Code

After editing the Excel file, regenerate the code:

```bash
cd frontend
npm run generate:severance
```

This reads the Excel file and generates `severanceFormCalculations.generated.ts`.

## 📝 Example: Modifying Preaviso Rules

### Step 1: Open Excel File

Open `severance/severance-config.xlsx` and go to the **"Preaviso Rules"** sheet.

### Step 2: Modify Rules

For example, to change the rule for "3 to 6 months" from 7 days to 10 days:

1. Find the row with "3 to 6 months"
2. Change the "Preaviso Days" column from `7` to `10`
3. Save the Excel file

### Step 3: Regenerate Code

```bash
cd frontend
npm run generate:severance
```

### Step 4: Integrate Generated Code

The generated code will be in `severanceFormCalculations.generated.ts`. You can either:
- Import it in your existing code
- Copy the functions you need
- Use it as a reference to update the main calculation file

## 🔗 Field Relationships Explained

The Excel file shows how fields are connected:

### Auto-Calculated Fields

These fields are automatically calculated when their dependencies change:

1. **preavisoDays**
   - **Depends on**: `startDate`
   - **Calculated when**: Start date changes or employee is selected
   - **Formula**: Based on service period (see Preaviso Rules sheet)

2. **terminationDate**
   - **Depends on**: `preavisoDays` (or can be manual)
   - **Calculated when**: Preaviso days change
   - **Formula**: `today + preavisoDays`

3. **vacationProportionalDays**
   - **Depends on**: `vacationDaysRemaining`
   - **Calculated when**: Remaining vacation days change
   - **Formula**: `= vacationDaysRemaining` (direct copy)

4. **thirteenthMonthDays**
   - **Depends on**: `terminationDate`
   - **Calculated when**: Termination date changes
   - **Formula**: Days from last July 1st to termination date (30 days/month)

5. **fourteenthMonthDays**
   - **Depends on**: `terminationDate`
   - **Calculated when**: Termination date changes
   - **Formula**: Days from January 1st to termination date (30 days/month)

### Manual Entry Fields

These fields are entered manually:

- `cesantiaDays`
- `cesantiaProportionalDays`
- `vacationBonusDays`
- `salariesDue`
- `overtimeDue`
- `otherPayments`
- `municipalTax`
- `preavisoPenalty`
- etc.

## 🛠️ Advanced: Adding New Fields

### Step 1: Add to Excel Template

1. Open `severance/severance-config.xlsx`
2. Go to **"Field Definitions"** sheet
3. Add a new row with:
   - Field Name (e.g., `newField`)
   - Display Label (e.g., `Nuevo Campo`)
   - Data Type (e.g., `number`)
   - Required (Yes/No)
   - Auto-Calculated (Yes/No)
   - Source/Dependency
   - Formula/Logic
   - Default Value

4. If it's auto-calculated, add to **"Calculation Formulas"** sheet
5. If it depends on other fields, add to **"Field Relationships"** sheet

### Step 2: Update TypeScript Interface

Add the new field to:
- `frontend/src/app/severance/calculator/page.tsx` - `SeveranceFormData` interface
- `frontend/src/lib/severancePdfGeneratorForm.ts` - `SeveranceFormData` interface

### Step 3: Add UI Field

Add the form field to the calculator page UI.

### Step 4: Regenerate and Test

```bash
npm run generate:severance-template  # Updates Excel with your new field
npm run generate:severance           # Generates code
```

## 📊 Understanding the Excel Structure

### Color Coding (Recommended)

You can add color coding to Excel sheets:
- **Green**: Auto-calculated fields
- **Yellow**: Manual entry fields
- **Blue**: Required fields
- **Orange**: Fields with dependencies

### Formulas in Excel

You can add Excel formulas to calculate values directly in Excel:
- This is for **documentation purposes only**
- The actual calculation code is generated from the "Formula/Logic" column
- Excel formulas help you verify calculations manually

## ⚠️ Important Notes

1. **Always regenerate code after editing Excel**: Run `npm run generate:severance` after making changes

2. **Backup your Excel file**: The Excel file is the source of truth. Keep it in version control or backed up.

3. **Test after changes**: After regenerating code, test the calculations in the app to ensure they're correct.

4. **Generated code is read-only**: Don't edit `severanceFormCalculations.generated.ts` directly. Edit the Excel file instead.

5. **Integration**: The generated code needs to be integrated with your existing codebase. You may need to:
   - Import functions from the generated file
   - Update existing calculation functions to use generated ones
   - Add UI hooks to trigger calculations

## 🔄 Workflow

```
1. Edit Excel file (severance-config.xlsx)
   ↓
2. Save Excel file
   ↓
3. Run: npm run generate:severance
   ↓
4. Review generated code
   ↓
5. Test in application
   ↓
6. Commit changes (Excel + generated code)
```

## 📞 Troubleshooting

### Excel file not found
- Run `npm run generate:severance-template` first to create it

### Generated code has errors
- Check Excel file for invalid values
- Ensure all required columns are filled
- Verify data types are correct

### Changes not reflected in app
- Make sure you regenerated code: `npm run generate:severance`
- Restart the dev server
- Clear browser cache

## 📚 Additional Resources

- See `SEVERANCE_CALCULATIONS_REFERENCE.md` for detailed formula explanations
- See `severance/CALCULO_DE_PRESTACION.md` for PDF field mappings

## 🎯 Next Steps

1. **Initial Setup**: Run `npm run generate:severance-template` to create the Excel file
2. **Review**: Open the Excel file and review all sheets
3. **Customize**: Modify rules and formulas as needed
4. **Generate**: Run `npm run generate:severance` to generate code
5. **Integrate**: Import and use generated functions in your codebase
6. **Test**: Verify all calculations work correctly

Happy configuring! 🎉


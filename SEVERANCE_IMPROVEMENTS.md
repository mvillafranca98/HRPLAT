# Severance Excel Template & PDF Export Improvements

## Summary

This document outlines the improvements made to the severance calculation system to ensure compatibility across different Excel viewers and add PDF export functionality.

## Changes Made

### 1. Simplified Excel Generator (`severanceExcelGeneratorSimplified.ts`)

**Created**: A new simplified Excel generator that only replaces specific cell values, preserving all template formatting, formulas, and layout.

**Key Features**:
- Only replaces 7 specific cells as per requirements:
  - `D3`: Employee full name
  - `I3`: Employee DNI / ID number  
  - `I4`: Termination motive
  - `E5`: Start date (Fecha de ingreso)
  - `E7`: End date (Fecha de retiro)
  - `E11`: Salary (sueldo)
  - `C22`: Vacation days (días de vacaciones restantes)

- **No layout manipulation**: Merged cells, visual elements, and scroll regions are preserved exactly as in the template
- **Formula preservation**: All other formulas in the template remain untouched
- **Cross-platform compatibility**: Works consistently across Google Sheets, LibreOffice Calc, and other viewers

### 2. PDF Export Utility (`severancePdfGenerator.ts`)

**Created**: A new PDF generation utility using PDFKit that creates printable PDF documents directly from severance data.

**Key Features**:
- Generates clean, printable PDF documents
- Includes all severance calculation details:
  - Employee information
  - Seniority (antigüedad)
  - Salary information
  - Vacation days
  - All benefits breakdown (Notice Pay, Severance Pay, Vacation Pay, 13th/14th Month)
  - Total benefits
- No dependencies on Excel formulas - all calculations done in code
- Proper formatting with headers, sections, and alignment

### 3. PDF API Endpoint (`/api/employees/[id]/severance-pdf/route.ts`)

**Created**: New API endpoint for generating PDF documents.

**Features**:
- Same authentication/authorization as Excel endpoint (Admin/HR_Staff only)
- Returns PDF file as download
- Proper error handling

### 4. UI Updates (`employees/[id]/edit/page.tsx`)

**Added**:
- "Descargar PDF" (Download PDF) button in the severance modal
- PDF generation state management
- Error handling for PDF generation

### 5. Excel Route Update

**Updated**: The existing Excel route now uses the simplified generator (`severanceExcelGeneratorSimplified.ts`) instead of the complex one.

## Benefits

1. **Consistency**: Excel files display correctly across all viewers (Google Sheets, LibreOffice, Excel, WhatsApp)
2. **Maintainability**: Clear separation between template content and dynamic data
3. **Flexibility**: Template formulas handle calculations - no need to modify them
4. **Printability**: PDF export provides clean, printable documents without Excel dependencies
5. **User Experience**: Users can choose between Excel or PDF formats

## Template Requirements

The Excel template (`RRHH.xlsx`) must:
- Have formulas for all calculations (totals, benefits, etc.)
- Only use the 7 specified cells (D3, I3, I4, E5, E7, E11, C22) for input values
- Keep all other cells as static text or formulas

## API Endpoints

### Excel Generation
- **Endpoint**: `POST /api/employees/[id]/severance`
- **Returns**: Excel file (.xlsx)
- **Uses**: Simplified generator (only replaces 7 cells)

### PDF Generation  
- **Endpoint**: `POST /api/employees/[id]/severance-pdf`
- **Returns**: PDF file (.pdf)
- **Uses**: Direct PDF generation from severance data

## Files Modified/Created

### New Files:
- `frontend/src/lib/severanceExcelGeneratorSimplified.ts`
- `frontend/src/lib/severancePdfGenerator.ts`
- `frontend/src/app/api/employees/[id]/severance-pdf/route.ts`

### Modified Files:
- `frontend/src/app/api/employees/[id]/severance/route.ts` (updated to use simplified generator)
- `frontend/src/app/employees/[id]/edit/page.tsx` (added PDF download button)

### Dependencies Added:
- `pdfkit` - PDF generation library
- `@types/pdfkit` - TypeScript types

## Testing

To test the improvements:

1. **Excel Generation**:
   - Generate a severance document for an employee
   - Open in Google Sheets - should display correctly
   - Open in LibreOffice Calc - should display correctly
   - Verify only the 7 specified cells have employee data

2. **PDF Generation**:
   - Click "Descargar PDF" button
   - Verify PDF downloads correctly
   - Open PDF and verify all information is present and formatted correctly

## Notes

- The old Excel generator (`severanceExcelGenerator.ts`) is still available but no longer used
- All formulas in the template are preserved and will calculate automatically
- The PDF generator calculates all values independently, so it doesn't depend on Excel formulas

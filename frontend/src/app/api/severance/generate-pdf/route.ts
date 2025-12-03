import { NextRequest, NextResponse } from 'next/server';
import { generateSeverancePDFFromForm, getPdfFilename } from '@/lib/severancePdfGeneratorForm';

export async function POST(request: NextRequest) {
  try {
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    
    // Check permissions (Admin or HR_Staff only)
    if (!userEmail || (userRole !== 'Admin' && userRole !== 'HR_Staff')) {
      return NextResponse.json(
        { error: 'Unauthorized. Solo personal de RRHH y Administradores pueden generar prestaciones.' },
        { status: 403 }
      );
    }

    const formData = await request.json();

    // Validate required fields
    if (!formData.employeeName || !formData.dni || !formData.startDate || !formData.terminationDate) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: nombre, DNI, fecha de ingreso o fecha de retiro.' },
        { status: 400 }
      );
    }

    // Generate PDF
    const pdfBuffer = await generateSeverancePDFFromForm(formData);

    // Get filename
    const filename = getPdfFilename(formData);

    // Return PDF file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating severance PDF:', error);
    return NextResponse.json(
      {
        error: 'Error al generar el PDF de prestaciones',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}


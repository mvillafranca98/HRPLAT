# Employee Leave/Vacation Request System - Implementation Guide

## 📋 Overview

This guide will help you implement a complete leave management system with:
- Database model for leave requests
- API routes for CRUD operations
- Employee interface to request time off
- Admin interface to approve/reject requests
- Dashboard display of pending requests
- Role-based access control

---

## 🎯 Step-by-Step Implementation

### **Step 1: Database Schema - Create LeaveRequest Model**

**File:** `frontend/prisma/schema.prisma`

Add this model after the `Contract` model:

```prisma
model LeaveRequest {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  startDate   DateTime
  endDate     DateTime
  type        String    // "Vacation", "Sick Leave", "Personal", "Other"
  reason      String?
  status      String    @default("Pending") // "Pending", "Approved", "Rejected"
  reviewedBy  String?   // Admin/HR who reviewed it
  reviewedAt  DateTime?
  comments    String?   // Admin comments/notes
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId])
  @@index([status])
}
```

Also update the `User` model to include the relation:

```prisma
model User {
  // ... existing fields ...
  contracts         Contract[]
  leaveRequests     LeaveRequest[]  // Add this line
}
```

**Commands to run:**
```bash
cd frontend
npx prisma migrate dev --name add_leave_request_model
npx prisma generate
```

---

### **Step 2: API Route - Create Leave Request (POST)**

**File:** `frontend/src/app/api/leave-requests/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Create new leave request (Employees only)
export async function POST(request: NextRequest) {
  try {
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    
    // Only employees can create leave requests
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email de usuario requerido' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const { startDate, endDate, type, reason } = await request.json();

    // Validation
    if (!startDate || !endDate || !type) {
      return NextResponse.json(
        { error: 'startDate, endDate, and type are required' },
        { status: 400 }
      );
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      return NextResponse.json(
        { error: 'Fechas inválidas' },
        { status: 400 }
      );
    }

    if (parsedEndDate < parsedStartDate) {
      return NextResponse.json(
        { error: 'La fecha de fin debe ser posterior a la fecha de inicio' },
        { status: 400 }
      );
    }

    // Create leave request
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId: user.id,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        type,
        reason: reason || null,
        status: 'Pending',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Solicitud de permiso creada exitosamente',
        leaveRequest,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating leave request:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
```

---

### **Step 3: API Route - Get Leave Requests (GET)**

**File:** `frontend/src/app/api/leave-requests/route.ts` (add to same file)

```typescript
// GET - Fetch leave requests (role-based access)
export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role');
    const userEmail = request.headers.get('x-user-email');
    
    // Employees can only see their own requests
    if (userRole === 'employee') {
      if (!userEmail) {
        return NextResponse.json(
          { error: 'Email de usuario requerido' },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      const leaveRequests = await prisma.leaveRequest.findMany({
        where: { userId: user.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              position: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return NextResponse.json(leaveRequests);
    }

    // Admin and HR_Staff can see all requests
    if (userRole === 'Admin' || userRole === 'HR_Staff') {
      const leaveRequests = await prisma.leaveRequest.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              position: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return NextResponse.json(leaveRequests);
    }

    return NextResponse.json(
      { error: 'No tienes permiso para ver solicitudes de permiso' },
      { status: 403 }
    );
  } catch (error: any) {
    console.error('Error fetching leave requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

### **Step 4: API Route - Update Leave Request Status (PUT)**

**File:** `frontend/src/app/api/leave-requests/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT - Update leave request status (approve/reject) - Admin/HR only
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userRole = request.headers.get('x-user-role');
    const userEmail = request.headers.get('x-user-email');
    
    // Only Admin and HR_Staff can approve/reject
    if (userRole !== 'Admin' && userRole !== 'HR_Staff') {
      return NextResponse.json(
        { error: 'No tienes permiso para aprobar/rechazar solicitudes' },
        { status: 403 }
      );
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email de usuario requerido' },
        { status: 400 }
      );
    }

    const { status, comments } = await request.json();

    // Validate status
    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "Approved" or "Rejected"' },
        { status: 400 }
      );
    }

    // Find leave request
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!leaveRequest) {
      return NextResponse.json(
        { error: 'Solicitud de permiso no encontrada' },
        { status: 404 }
      );
    }

    // Get reviewer info
    const reviewer = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, name: true },
    });

    if (!reviewer) {
      return NextResponse.json(
        { error: 'Revisor no encontrado' },
        { status: 404 }
      );
    }

    // Update leave request
    const updatedRequest = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        reviewedBy: reviewer.id,
        reviewedAt: new Date(),
        comments: comments || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: `Solicitud ${status === 'Approved' ? 'aprobada' : 'rechazada'} exitosamente`,
      leaveRequest: updatedRequest,
    });
  } catch (error: any) {
    console.error('Error updating leave request:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
```

---

### **Step 5: Frontend - Create Leave Request Page**

**File:** `frontend/src/app/leave-requests/new/page.tsx`

(Follow the same pattern as `/contracts/new/page.tsx`)

Key features:
- Form with fields: startDate, endDate, type (dropdown), reason (textarea)
- Only accessible to employees
- Redirects after successful submission

---

### **Step 6: Frontend - View Leave Requests Page**

**File:** `frontend/src/app/leave-requests/page.tsx`

Features:
- List of leave requests (role-based: own requests vs all requests)
- Status badges (Pending, Approved, Rejected)
- Filter by status
- Sort by date

---

### **Step 7: Frontend - Admin Approval Page**

**File:** `frontend/src/app/leave-requests/manage/page.tsx`

Features:
- Show only pending requests for Admin/HR
- Approve/Reject buttons
- Comment field for admin notes
- Employee name, dates, type, reason display

---

### **Step 8: Dashboard Integration**

**File:** `frontend/src/app/dashboard/page.tsx`

Add:
- Card showing pending leave requests count
- Link to manage requests (Admin/HR) or view requests (Employee)

---

### **Step 9: Navbar Links**

**File:** `frontend/src/components/Navbar.tsx`

Add:
- "Solicitudes de Permiso" link
- Visible to all users (employees see their requests, admins see all)

---

## 📝 Implementation Checklist

- [ ] Step 1: Add LeaveRequest model to Prisma schema
- [ ] Step 2: Run Prisma migration
- [ ] Step 3: Create POST API route for creating requests
- [ ] Step 4: Create GET API route for fetching requests
- [ ] Step 5: Create PUT API route for approving/rejecting
- [ ] Step 6: Create new leave request page
- [ ] Step 7: Create view leave requests page
- [ ] Step 8: Create admin management page
- [ ] Step 9: Add dashboard cards
- [ ] Step 10: Add navbar links

---

## 🎨 UI Components to Create

1. **Leave Request Form** - Similar to contract form
2. **Leave Request Card** - Display request with status badge
3. **Status Badge Component** - Color-coded (Pending=yellow, Approved=green, Rejected=red)
4. **Admin Action Buttons** - Approve/Reject with comment modal

---

## 🔒 Access Control Summary

- **Employees:** Can create and view their own requests
- **Admin/HR_Staff:** Can view all requests and approve/reject
- **Other roles:** No access

---

Would you like me to implement all these steps now?


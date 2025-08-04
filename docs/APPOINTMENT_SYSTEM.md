# Appointment System Documentation

## Overview

The Appointment System provides comprehensive scheduling and management capabilities for both individual customers and party events. It supports various appointment types, automated notifications via email and SMS, conflict detection, and integration with the broader business workflow including alterations and party management.

## Table of Contents

1. [Appointment System Architecture](#appointment-system-architecture)
2. [Appointment Types and Structure](#appointment-types-and-structure)
3. [Individual Appointments](#individual-appointments)
4. [Party Appointments](#party-appointments)
5. [Scheduling and Conflict Detection](#scheduling-and-conflict-detection)
6. [Notification System](#notification-system)
7. [API Endpoints](#api-endpoints)
8. [Frontend Integration](#frontend-integration)
9. [Calendar Integration](#calendar-integration)
10. [Reporting and Analytics](#reporting-and-analytics)
11. [Best Practices](#best-practices)
12. [Examples](#examples)

## Appointment System Architecture

### Core Components

#### Appointment Controller
- **Location**: `backend/src/controllers/appointmentsController.ts`
- **Purpose**: Handle appointment CRUD operations and business logic
- **Features**: Scheduling, conflict detection, notification management
- **Integration**: Works with customers, parties, alterations, and notifications

#### Appointment Service
- **Location**: `backend/src/services/appointmentService.ts`
- **Purpose**: Business logic for appointment operations
- **Features**: Availability checking, conflict resolution, notification scheduling
- **Output**: Structured appointment data and scheduling recommendations

#### Notification Service
- **Location**: `backend/src/services/notificationService.ts`
- **Purpose**: Handle email and SMS notifications
- **Features**: Twilio SMS, SendGrid email, notification templates
- **Integration**: Automated reminders and status updates

#### Frontend Components
- **Location**: `frontend/components/ui/AppointmentScheduler.tsx`
- **Purpose**: Appointment scheduling and management interface
- **Features**: Calendar view, conflict detection, notification preferences
- **Integration**: Customer selection and party management

### Data Flow

```
Appointment Creation
        ↓
   Conflict Detection
        ↓
   Schedule Confirmation
        ↓
   Notification Scheduling
        ↓
   Calendar Integration
        ↓
   Appointment Execution
        ↓
   Follow-up Actions
```

## Appointment Types and Structure

### Appointment Model

#### Core Appointment Information
```typescript
interface Appointment {
  id: number;
  customerId: number;
  partyId?: number;              // Optional party association
  partyMemberId?: number;        // Specific party member
  dateTime: Date;                // Appointment date and time
  duration: number;              // Duration in minutes
  type: AppointmentType;         // Type of appointment
  status: AppointmentStatus;     // Current status
  notes?: string;                // Additional notes
  tailorId?: number;             // Assigned tailor
  location?: string;             // Appointment location
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  customer: Customer;
  party?: Party;
  partyMember?: PartyMember;
  tailor?: User;
  notifications: AppointmentNotification[];
}
```

#### Appointment Types
```typescript
enum AppointmentType {
  CONSULTATION = 'CONSULTATION',     // Initial consultation
  FITTING = 'FITTING',               // Garment fitting
  ALTERATION = 'ALTERATION',         // Alteration work
  PICKUP = 'PICKUP',                 // Final pickup
  REHEARSAL = 'REHEARSAL',           // Wedding rehearsal
  MEASUREMENT = 'MEASUREMENT',       // Taking measurements
  FOLLOW_UP = 'FOLLOW_UP',          // Follow-up appointment
  EMERGENCY = 'EMERGENCY'            // Emergency/rush appointment
}
```

#### Appointment Status
```typescript
enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',           // Appointment scheduled
  CONFIRMED = 'CONFIRMED',           // Customer confirmed
  IN_PROGRESS = 'IN_PROGRESS',       // Currently happening
  COMPLETED = 'COMPLETED',           // Appointment completed
  CANCELLED = 'CANCELLED',           // Appointment cancelled
  NO_SHOW = 'NO_SHOW',              // Customer didn't show
  RESCHEDULED = 'RESCHEDULED'        // Appointment rescheduled
}
```

### Appointment Duration Standards

#### Standard Durations
- **CONSULTATION**: 30 minutes
- **FITTING**: 45 minutes
- **ALTERATION**: 60 minutes
- **PICKUP**: 15 minutes
- **REHEARSAL**: 30 minutes
- **MEASUREMENT**: 30 minutes
- **FOLLOW_UP**: 30 minutes
- **EMERGENCY**: 45 minutes

#### Custom Durations
- **Party Fittings**: 60-90 minutes (multiple people)
- **Complex Alterations**: 90-120 minutes
- **Wedding Consultations**: 60 minutes
- **Group Events**: Variable based on group size

## Individual Appointments

### Appointment Creation

#### Basic Appointment Creation
```typescript
interface IndividualAppointmentData {
  customerId: number;
  dateTime: Date;
  type: AppointmentType;
  duration?: number;
  notes?: string;
  tailorId?: number;
  location?: string;
}
```

#### Creation Process
```typescript
async function createIndividualAppointment(data: IndividualAppointmentData): Promise<Appointment> {
  // 1. Validate customer exists
  const customer = await prisma.customer.findUnique({
    where: { id: data.customerId }
  });
  
  if (!customer) {
    throw new Error('Customer not found');
  }
  
  // 2. Check for scheduling conflicts
  const conflicts = await detectConflicts(data.customerId, data.dateTime, data.duration || 30);
  if (conflicts.length > 0) {
    throw new Error(`Scheduling conflicts detected: ${conflicts.map(c => c.reason).join(', ')}`);
  }
  
  // 3. Create appointment
  const appointment = await prisma.appointment.create({
    data: {
      customerId: data.customerId,
      dateTime: data.dateTime,
      duration: data.duration || getDefaultDuration(data.type),
      type: data.type,
      status: 'SCHEDULED',
      notes: data.notes,
      tailorId: data.tailorId,
      location: data.location
    },
    include: {
      customer: true,
      tailor: true
    }
  });
  
  // 4. Schedule notifications
  await scheduleAppointmentNotifications(appointment.id);
  
  return appointment;
}
```

### Appointment Management

#### Status Updates
```typescript
async function updateAppointmentStatus(appointmentId: number, status: AppointmentStatus, notes?: string): Promise<Appointment> {
  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status,
      notes: notes ? `${appointment.notes || ''}\n${notes}` : appointment.notes
    },
    include: {
      customer: true,
      tailor: true
    }
  });
  
  // Send status update notifications
  await sendStatusUpdateNotification(appointment, status);
  
  return appointment;
}
```

#### Rescheduling
```typescript
async function rescheduleAppointment(appointmentId: number, newDateTime: Date): Promise<Appointment> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId }
  });
  
  if (!appointment) {
    throw new Error('Appointment not found');
  }
  
  // Check for conflicts with new time
  const conflicts = await detectConflicts(appointment.customerId, newDateTime, appointment.duration);
  if (conflicts.length > 0) {
    throw new Error(`Scheduling conflicts detected: ${conflicts.map(c => c.reason).join(', ')}`);
  }
  
  // Update appointment
  const updatedAppointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      dateTime: newDateTime,
      status: 'RESCHEDULED'
    },
    include: {
      customer: true,
      tailor: true
    }
  });
  
  // Send reschedule notifications
  await sendRescheduleNotification(updatedAppointment);
  
  return updatedAppointment;
}
```

## Party Appointments

### Party Appointment Creation

#### Group Appointment Data
```typescript
interface PartyAppointmentData {
  partyId: number;
  dateTime: Date;
  type: AppointmentType;
  duration?: number;
  notes?: string;
  tailorId?: number;
  location?: string;
  includeAllMembers?: boolean;    // Include all party members
  memberIds?: number[];           // Specific member IDs to include
}
```

#### Batch Appointment Creation
```typescript
async function createPartyAppointments(data: PartyAppointmentData): Promise<Appointment[]> {
  const party = await prisma.party.findUnique({
    where: { id: data.partyId },
    include: {
      members: {
        include: {
          customer: true
        }
      }
    }
  });
  
  if (!party) {
    throw new Error('Party not found');
  }
  
  // Determine which members to include
  const membersToInclude = data.includeAllMembers 
    ? party.members 
    : party.members.filter(m => data.memberIds?.includes(m.id));
  
  const appointments = [];
  
  for (const member of membersToInclude) {
    // Check for individual conflicts
    const conflicts = await detectConflicts(member.customerId, data.dateTime, data.duration || 30);
    if (conflicts.length > 0) {
      console.warn(`Conflict detected for ${member.customer.name}: ${conflicts.map(c => c.reason).join(', ')}`);
      continue; // Skip this member but continue with others
    }
    
    // Create appointment for this member
    const appointment = await prisma.appointment.create({
      data: {
        customerId: member.customerId,
        partyId: data.partyId,
        partyMemberId: member.id,
        dateTime: data.dateTime,
        duration: data.duration || getDefaultDuration(data.type),
        type: data.type,
        status: 'SCHEDULED',
        notes: `${data.notes} - ${member.role}`,
        tailorId: data.tailorId,
        location: data.location
      },
      include: {
        customer: true,
        party: true,
        partyMember: true,
        tailor: true
      }
    });
    
    appointments.push(appointment);
  }
  
  // Schedule group notifications
  await schedulePartyAppointmentNotifications(appointments);
  
  return appointments;
}
```

### Party Appointment Coordination

#### Timeline Management
```typescript
interface PartyTimeline {
  eventDate: Date;
  rehearsalDate?: Date;
  fittingDate?: Date;
  pickupDate?: Date;
  alterationsDueDate?: Date;
}

async function createPartyTimeline(partyId: number, timeline: PartyTimeline): Promise<Appointment[]> {
  const appointments = [];
  
  // Create rehearsal appointments
  if (timeline.rehearsalDate) {
    const rehearsalAppointments = await createPartyAppointments({
      partyId,
      dateTime: timeline.rehearsalDate,
      type: 'REHEARSAL',
      notes: 'Wedding rehearsal fitting',
      includeAllMembers: true
    });
    appointments.push(...rehearsalAppointments);
  }
  
  // Create fitting appointments
  if (timeline.fittingDate) {
    const fittingAppointments = await createPartyAppointments({
      partyId,
      dateTime: timeline.fittingDate,
      type: 'FITTING',
      notes: 'Wedding party fitting',
      includeAllMembers: true
    });
    appointments.push(...fittingAppointments);
  }
  
  // Create pickup appointments
  if (timeline.pickupDate) {
    const pickupAppointments = await createPartyAppointments({
      partyId,
      dateTime: timeline.pickupDate,
      type: 'PICKUP',
      notes: 'Final pickup for wedding',
      includeAllMembers: true
    });
    appointments.push(...pickupAppointments);
  }
  
  return appointments;
}
```

## Scheduling and Conflict Detection

### Conflict Detection

#### Individual Conflicts
```typescript
interface SchedulingConflict {
  type: 'CUSTOMER_CONFLICT' | 'TAILOR_CONFLICT' | 'LOCATION_CONFLICT';
  reason: string;
  conflictingAppointment?: Appointment;
}

async function detectConflicts(customerId: number, dateTime: Date, duration: number): Promise<SchedulingConflict[]> {
  const conflicts = [];
  
  // Check customer conflicts
  const customerConflicts = await prisma.appointment.findMany({
    where: {
      customerId,
      dateTime: {
        gte: new Date(dateTime.getTime() - duration * 60 * 1000),
        lte: new Date(dateTime.getTime() + duration * 60 * 1000)
      },
      status: {
        in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
      }
    }
  });
  
  if (customerConflicts.length > 0) {
    conflicts.push({
      type: 'CUSTOMER_CONFLICT',
      reason: 'Customer has conflicting appointment',
      conflictingAppointment: customerConflicts[0]
    });
  }
  
  // Check tailor conflicts
  const tailorConflicts = await prisma.appointment.findMany({
    where: {
      tailorId: { not: null },
      dateTime: {
        gte: new Date(dateTime.getTime() - duration * 60 * 1000),
        lte: new Date(dateTime.getTime() + duration * 60 * 1000)
      },
      status: {
        in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
      }
    }
  });
  
  if (tailorConflicts.length > 0) {
    conflicts.push({
      type: 'TAILOR_CONFLICT',
      reason: 'Tailor has conflicting appointment',
      conflictingAppointment: tailorConflicts[0]
    });
  }
  
  return conflicts;
}
```

#### Party Conflicts
```typescript
async function detectPartyConflicts(partyId: number, dateTime: Date, duration: number): Promise<SchedulingConflict[]> {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { members: true }
  });
  
  if (!party) {
    throw new Error('Party not found');
  }
  
  const allConflicts = [];
  
  for (const member of party.members) {
    const memberConflicts = await detectConflicts(member.customerId, dateTime, duration);
    allConflicts.push(...memberConflicts.map(conflict => ({
      ...conflict,
      member: member.customer.name,
      role: member.role
    })));
  }
  
  return allConflicts;
}
```

### Availability Checking

#### Tailor Availability
```typescript
async function checkTailorAvailability(tailorId: number, dateTime: Date, duration: number): Promise<boolean> {
  const conflicts = await prisma.appointment.findMany({
    where: {
      tailorId,
      dateTime: {
        gte: new Date(dateTime.getTime() - duration * 60 * 1000),
        lte: new Date(dateTime.getTime() + duration * 60 * 1000)
      },
      status: {
        in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
      }
    }
  });
  
  return conflicts.length === 0;
}
```

#### Location Availability
```typescript
async function checkLocationAvailability(location: string, dateTime: Date, duration: number): Promise<boolean> {
  const conflicts = await prisma.appointment.findMany({
    where: {
      location,
      dateTime: {
        gte: new Date(dateTime.getTime() - duration * 60 * 1000),
        lte: new Date(dateTime.getTime() + duration * 60 * 1000)
      },
      status: {
        in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
      }
    }
  });
  
  return conflicts.length === 0;
}
```

## Notification System

### Notification Types

#### Appointment Notifications
```typescript
enum NotificationType {
  APPOINTMENT_CONFIRMATION = 'APPOINTMENT_CONFIRMATION',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  APPOINTMENT_RESCHEDULE = 'APPOINTMENT_RESCHEDULE',
  APPOINTMENT_CANCELLATION = 'APPOINTMENT_CANCELLATION',
  APPOINTMENT_REMINDER_24H = 'APPOINTMENT_REMINDER_24H',
  APPOINTMENT_REMINDER_1H = 'APPOINTMENT_REMINDER_1H',
  APPOINTMENT_FOLLOW_UP = 'APPOINTMENT_FOLLOW_UP'
}
```

#### Notification Channels
```typescript
enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  BOTH = 'BOTH'
}
```

### Notification Scheduling

#### Automatic Notification Scheduling
```typescript
async function scheduleAppointmentNotifications(appointmentId: number): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      customer: true,
      party: true
    }
  });
  
  if (!appointment) return;
  
  // Schedule confirmation notification
  await scheduleNotification({
    appointmentId,
    type: 'APPOINTMENT_CONFIRMATION',
    channel: 'BOTH',
    scheduledFor: new Date(),
    customerId: appointment.customerId
  });
  
  // Schedule 24-hour reminder
  const reminder24h = new Date(appointment.dateTime.getTime() - 24 * 60 * 60 * 1000);
  if (reminder24h > new Date()) {
    await scheduleNotification({
      appointmentId,
      type: 'APPOINTMENT_REMINDER_24H',
      channel: 'SMS',
      scheduledFor: reminder24h,
      customerId: appointment.customerId
    });
  }
  
  // Schedule 1-hour reminder
  const reminder1h = new Date(appointment.dateTime.getTime() - 60 * 60 * 1000);
  if (reminder1h > new Date()) {
    await scheduleNotification({
      appointmentId,
      type: 'APPOINTMENT_REMINDER_1H',
      channel: 'SMS',
      scheduledFor: reminder1h,
      customerId: appointment.customerId
    });
  }
}
```

#### Party Notification Scheduling
```typescript
async function schedulePartyAppointmentNotifications(appointments: Appointment[]): Promise<void> {
  for (const appointment of appointments) {
    await scheduleAppointmentNotifications(appointment.id);
  }
  
  // Send group notification to primary contact
  const party = appointments[0]?.party;
  if (party) {
    const primaryMember = party.members.find(m => m.isPrimary);
    if (primaryMember) {
      await scheduleNotification({
        appointmentId: appointments[0].id,
        type: 'APPOINTMENT_CONFIRMATION',
        channel: 'EMAIL',
        scheduledFor: new Date(),
        customerId: primaryMember.customerId,
        isGroupNotification: true,
        partyId: party.id
      });
    }
  }
}
```

### Notification Templates

#### Email Templates
```typescript
const emailTemplates = {
  APPOINTMENT_CONFIRMATION: {
    subject: 'Appointment Confirmed - SuitSync',
    template: `
      <h2>Appointment Confirmed</h2>
      <p>Dear {{customerName}},</p>
      <p>Your appointment has been confirmed for:</p>
      <ul>
        <li><strong>Date:</strong> {{appointmentDate}}</li>
        <li><strong>Time:</strong> {{appointmentTime}}</li>
        <li><strong>Type:</strong> {{appointmentType}}</li>
        <li><strong>Duration:</strong> {{duration}} minutes</li>
      </ul>
      <p>Please arrive 5 minutes early for your appointment.</p>
      <p>If you need to reschedule, please call us at 555-123-4567.</p>
    `
  },
  
  APPOINTMENT_REMINDER_24H: {
    subject: 'Appointment Reminder - Tomorrow',
    template: `
      <h2>Appointment Reminder</h2>
      <p>Dear {{customerName}},</p>
      <p>This is a reminder that you have an appointment tomorrow:</p>
      <ul>
        <li><strong>Date:</strong> {{appointmentDate}}</li>
        <li><strong>Time:</strong> {{appointmentTime}}</li>
        <li><strong>Type:</strong> {{appointmentType}}</li>
      </ul>
      <p>We look forward to seeing you!</p>
    `
  }
};
```

#### SMS Templates
```typescript
const smsTemplates = {
  APPOINTMENT_CONFIRMATION: 'Hi {{customerName}}, your {{appointmentType}} appointment is confirmed for {{appointmentDate}} at {{appointmentTime}}. Reply STOP to opt out.',
  
  APPOINTMENT_REMINDER_24H: 'Reminder: You have a {{appointmentType}} appointment tomorrow at {{appointmentTime}}. Call 555-123-4567 to reschedule.',
  
  APPOINTMENT_REMINDER_1H: 'Your {{appointmentType}} appointment is in 1 hour. We look forward to seeing you!',
  
  APPOINTMENT_RESCHEDULE: 'Hi {{customerName}}, your appointment has been rescheduled to {{appointmentDate}} at {{appointmentTime}}. Call 555-123-4567 with questions.'
};
```

### Notification Delivery

#### Email Delivery (SendGrid)
```typescript
async function sendEmailNotification(notification: AppointmentNotification): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: notification.appointmentId },
    include: { customer: true }
  });
  
  if (!appointment || !appointment.customer.email) return;
  
  const template = emailTemplates[notification.type];
  const html = template.template
    .replace('{{customerName}}', appointment.customer.name)
    .replace('{{appointmentDate}}', appointment.dateTime.toLocaleDateString())
    .replace('{{appointmentTime}}', appointment.dateTime.toLocaleTimeString())
    .replace('{{appointmentType}}', appointment.type)
    .replace('{{duration}}', appointment.duration.toString());
  
  await sendGrid.send({
    to: appointment.customer.email,
    from: 'noreply@suitsync.com',
    subject: template.subject,
    html
  });
  
  // Update notification status
  await prisma.appointmentNotification.update({
    where: { id: notification.id },
    data: { sentAt: new Date(), status: 'SENT' }
  });
}
```

#### SMS Delivery (Twilio)
```typescript
async function sendSMSNotification(notification: AppointmentNotification): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: notification.appointmentId },
    include: { customer: true }
  });
  
  if (!appointment || !appointment.customer.phone) return;
  
  const template = smsTemplates[notification.type];
  const message = template
    .replace('{{customerName}}', appointment.customer.name)
    .replace('{{appointmentDate}}', appointment.dateTime.toLocaleDateString())
    .replace('{{appointmentTime}}', appointment.dateTime.toLocaleTimeString())
    .replace('{{appointmentType}}', appointment.type);
  
  await twilio.messages.create({
    body: message,
    from: '+15551234567',
    to: appointment.customer.phone
  });
  
  // Update notification status
  await prisma.appointmentNotification.update({
    where: { id: notification.id },
    data: { sentAt: new Date(), status: 'SENT' }
  });
}
```

## API Endpoints

### Individual Appointments

#### Create Appointment
```http
POST /api/appointments
```

#### Request Body
```json
{
  "customerId": 123,
  "dateTime": "2024-12-15T14:00:00.000Z",
  "type": "FITTING",
  "duration": 45,
  "notes": "Wedding suit fitting",
  "tailorId": 5,
  "location": "Main Store"
}
```

#### Response
```json
{
  "success": true,
  "appointment": {
    "id": 1,
    "customerId": 123,
    "dateTime": "2024-12-15T14:00:00.000Z",
    "duration": 45,
    "type": "FITTING",
    "status": "SCHEDULED",
    "customer": {
      "id": 123,
      "name": "John Smith",
      "email": "john@example.com",
      "phone": "555-123-4567"
    },
    "tailor": {
      "id": 5,
      "name": "Mike Johnson"
    }
  }
}
```

#### Get Appointments
```http
GET /api/appointments?customerId=123&status=SCHEDULED&startDate=2024-12-01&endDate=2024-12-31
```

#### Update Appointment
```http
PUT /api/appointments/:appointmentId
```

#### Request Body
```json
{
  "dateTime": "2024-12-15T15:00:00.000Z",
  "status": "CONFIRMED",
  "notes": "Customer confirmed appointment"
}
```

#### Cancel Appointment
```http
DELETE /api/appointments/:appointmentId
```

### Party Appointments

#### Create Party Appointments
```http
POST /api/parties/:partyId/appointments
```

#### Request Body
```json
{
  "dateTime": "2024-12-10T14:00:00.000Z",
  "type": "FITTING",
  "duration": 90,
  "notes": "Wedding party fitting",
  "tailorId": 5,
  "includeAllMembers": true
}
```

#### Get Party Appointments
```http
GET /api/parties/:partyId/appointments
```

### Notifications

#### Get Notification Preferences
```http
GET /api/customers/:customerId/notification-preferences
```

#### Update Notification Preferences
```http
PUT /api/customers/:customerId/notification-preferences
```

#### Request Body
```json
{
  "emailNotifications": true,
  "smsNotifications": true,
  "reminder24h": true,
  "reminder1h": true,
  "marketingEmails": false
}
```

## Frontend Integration

### Appointment Components

#### AppointmentScheduler
```typescript
interface AppointmentSchedulerProps {
  customerId?: number;
  partyId?: number;
  onAppointmentCreated: (appointment: Appointment) => void;
  onConflictDetected: (conflicts: SchedulingConflict[]) => void;
}
```

#### AppointmentCalendar
```typescript
interface AppointmentCalendarProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onTimeSlotClick: (dateTime: Date) => void;
  view: 'day' | 'week' | 'month';
}
```

#### AppointmentForm
```typescript
interface AppointmentFormProps {
  appointment?: Appointment;
  onSubmit: (data: AppointmentFormData) => void;
  onCancel: () => void;
  isEditing?: boolean;
}
```

### Form Validation

#### Appointment Form Schema
```typescript
const appointmentFormSchema = z.object({
  customerId: z.number().positive('Customer is required'),
  dateTime: z.date().min(new Date(), 'Appointment must be in the future'),
  type: z.enum(['CONSULTATION', 'FITTING', 'ALTERATION', 'PICKUP', 'REHEARSAL', 'MEASUREMENT', 'FOLLOW_UP', 'EMERGENCY']),
  duration: z.number().min(15).max(240),
  notes: z.string().max(500),
  tailorId: z.number().optional(),
  location: z.string().max(100)
});
```

### Conflict Resolution

#### Conflict Display Component
```typescript
interface ConflictDisplayProps {
  conflicts: SchedulingConflict[];
  onResolve: (resolution: ConflictResolution) => void;
  onIgnore: () => void;
}
```

## Calendar Integration

### Calendar Views

#### Day View
- **Time Slots**: 15-minute intervals
- **Appointment Display**: Visual blocks with customer names
- **Conflict Highlighting**: Red highlighting for conflicts
- **Quick Actions**: Click to create/edit appointments

#### Week View
- **Daily Columns**: Each day as a column
- **Time Rows**: Hour-based time slots
- **Appointment Blocks**: Visual representation of appointments
- **Drag and Drop**: Reschedule by dragging

#### Month View
- **Calendar Grid**: Traditional calendar layout
- **Appointment Indicators**: Dots or numbers for appointment counts
- **Quick Navigation**: Click to jump to day view
- **Summary Information**: Daily appointment counts

### Calendar Features

#### Drag and Drop Rescheduling
```typescript
function handleAppointmentDrop(appointmentId: number, newDateTime: Date): void {
  rescheduleAppointment(appointmentId, newDateTime)
    .then(() => {
      showNotification('Appointment rescheduled successfully', 'success');
      refreshCalendar();
    })
    .catch(error => {
      showNotification('Failed to reschedule appointment', 'error');
    });
}
```

#### Conflict Detection
```typescript
function handleTimeSlotClick(dateTime: Date): void {
  const conflicts = detectConflicts(selectedCustomerId, dateTime, defaultDuration);
  if (conflicts.length > 0) {
    showConflictDialog(conflicts);
  } else {
    showAppointmentForm(dateTime);
  }
}
```

## Reporting and Analytics

### Appointment Analytics

#### Performance Metrics
```typescript
interface AppointmentAnalytics {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowRate: number;
  averageDuration: number;
  popularTimeSlots: TimeSlotUsage[];
  appointmentTypeDistribution: Record<AppointmentType, number>;
}
```

#### Customer Analytics
```typescript
interface CustomerAppointmentAnalytics {
  customerId: number;
  totalAppointments: number;
  completedAppointments: number;
  noShowCount: number;
  averageAppointmentsPerMonth: number;
  preferredTimeSlots: string[];
  appointmentHistory: Appointment[];
}
```

### Reporting Functions

#### Generate Appointment Report
```typescript
async function generateAppointmentReport(startDate: Date, endDate: Date): Promise<AppointmentReport> {
  const appointments = await prisma.appointment.findMany({
    where: {
      dateTime: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      customer: true,
      tailor: true,
      party: true
    }
  });
  
  return {
    period: { startDate, endDate },
    summary: {
      total: appointments.length,
      completed: appointments.filter(a => a.status === 'COMPLETED').length,
      cancelled: appointments.filter(a => a.status === 'CANCELLED').length,
      noShow: appointments.filter(a => a.status === 'NO_SHOW').length
    },
    byType: groupBy(appointments, 'type'),
    byTailor: groupBy(appointments, 'tailorId'),
    byStatus: groupBy(appointments, 'status'),
    appointments
  };
}
```

## Best Practices

### Scheduling Guidelines

#### Appointment Timing
- **Buffer Time**: Include 15-minute buffers between appointments
- **Peak Hours**: Schedule complex appointments during peak hours
- **Rush Orders**: Prioritize rush orders with shorter notice
- **Group Appointments**: Allow extra time for party appointments

#### Conflict Prevention
- **Advance Booking**: Encourage advance booking for popular time slots
- **Flexible Scheduling**: Offer multiple time slots for customer convenience
- **Automated Reminders**: Send reminders to reduce no-shows
- **Easy Rescheduling**: Provide simple rescheduling options

### Notification Best Practices

#### Timing
- **Confirmation**: Send immediately upon booking
- **24-Hour Reminder**: Send 24 hours before appointment
- **1-Hour Reminder**: Send 1 hour before appointment
- **Follow-up**: Send 24 hours after appointment

#### Content
- **Clear Information**: Include all relevant appointment details
- **Action Items**: Provide clear next steps
- **Contact Information**: Include contact details for questions
- **Personalization**: Use customer name and specific details

### Customer Experience

#### Booking Process
- **Simple Interface**: Easy-to-use booking interface
- **Multiple Channels**: Allow booking via phone, web, and mobile
- **Instant Confirmation**: Provide immediate confirmation
- **Flexible Options**: Offer various appointment types and durations

#### Communication
- **Proactive Updates**: Keep customers informed of changes
- **Multiple Channels**: Use email and SMS for notifications
- **Personal Touch**: Include personalized messages
- **Easy Cancellation**: Simple cancellation and rescheduling process

## Examples

### Individual Appointment Example

#### Wedding Suit Fitting
```typescript
const weddingFitting = {
  customerId: 123,
  dateTime: new Date("2024-12-15T14:00:00.000Z"),
  type: "FITTING",
  duration: 60,
  notes: "Wedding suit fitting - navy suit with vest",
  tailorId: 5,
  location: "Main Store"
};

// Create appointment
const appointment = await createIndividualAppointment(weddingFitting);

// Automatic notifications scheduled:
// - Confirmation email/SMS sent immediately
// - 24-hour reminder SMS
// - 1-hour reminder SMS
```

### Party Appointment Example

#### Wedding Party Fitting
```typescript
const weddingPartyFitting = {
  partyId: 1,
  dateTime: new Date("2024-12-10T14:00:00.000Z"),
  type: "FITTING",
  duration: 90,
  notes: "Wedding party fitting - all members",
  tailorId: 5,
  includeAllMembers: true
};

// Create appointments for all party members
const appointments = await createPartyAppointments(weddingPartyFitting);

// Notifications sent to:
// - Each individual member
// - Primary contact (groom) for group coordination
```

### Emergency Appointment Example

#### Rush Alteration
```typescript
const emergencyAppointment = {
  customerId: 456,
  dateTime: new Date("2024-12-03T16:00:00.000Z"),
  type: "EMERGENCY",
  duration: 45,
  notes: "Rush hem for business meeting tomorrow",
  tailorId: 3,
  location: "Main Store"
};

// Check for immediate availability
const conflicts = await detectConflicts(456, emergencyAppointment.dateTime, 45);
if (conflicts.length === 0) {
  const appointment = await createIndividualAppointment(emergencyAppointment);
  // Immediate confirmation sent
}
```

## Conclusion

The Appointment System provides comprehensive scheduling and management capabilities for both individual customers and party events. It includes automated notifications, conflict detection, and seamless integration with the broader business workflow.

Key benefits include:
- **Flexible Scheduling**: Support for individual and party appointments
- **Automated Notifications**: Email and SMS reminders and confirmations
- **Conflict Detection**: Intelligent scheduling conflict prevention
- **Calendar Integration**: Visual calendar interface with drag-and-drop
- **Reporting**: Comprehensive analytics and reporting capabilities

The system is designed to streamline appointment management while providing excellent customer service through proactive communication and efficient scheduling processes. 
# Party Creation and Management Documentation

## Overview

The Party Creation and Management system provides comprehensive functionality for managing groups of customers, particularly for events like weddings, proms, and corporate functions. It enables efficient coordination of multiple customers, their appointments, alterations, and event-specific requirements.

## Table of Contents

1. [Party System Architecture](#party-system-architecture)
2. [Party Structure](#party-structure)
3. [Party Creation](#party-creation)
4. [Party Member Management](#party-member-management)
5. [Event Management](#event-management)
6. [Appointment Coordination](#appointment-coordination)
7. [Alteration Integration](#alteration-integration)
8. [API Endpoints](#api-endpoints)
9. [Frontend Integration](#frontend-integration)
10. [Reporting and Analytics](#reporting-and-analytics)
11. [Best Practices](#best-practices)
12. [Examples](#examples)

## Party System Architecture

### Core Components

#### Party Controller
- **Location**: `backend/src/controllers/partiesController.ts`
- **Purpose**: Handle party creation, updates, and management
- **Features**: CRUD operations, member management, event coordination
- **Integration**: Works with customers, appointments, and alterations

#### Party Service
- **Location**: `backend/src/services/partyService.ts`
- **Purpose**: Business logic for party operations
- **Features**: Member assignment, event scheduling, coordination
- **Output**: Structured party data and relationships

#### Frontend Components
- **Location**: `frontend/components/ui/PartyManagement.tsx`
- **Purpose**: Party creation and management interface
- **Features**: Member management, event details, coordination tools
- **Integration**: Customer selection and appointment scheduling

### Data Flow

```
Party Creation
        ↓
   Member Addition
        ↓
   Event Configuration
        ↓
   Appointment Scheduling
        ↓
   Alteration Coordination
        ↓
   Event Execution
```

## Party Structure

### Party Model

#### Core Party Information
```typescript
interface Party {
  id: number;
  name: string;                    // "Smith Wedding", "Prom 2024"
  eventType: EventType;           // WEDDING, PROM, CORPORATE, OTHER
  eventDate: Date;                // Primary event date
  status: PartyStatus;            // PLANNING, ACTIVE, COMPLETED, CANCELLED
  notes?: string;                 // Additional notes
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  members: PartyMember[];
  appointments: Appointment[];
  alterationJobs: AlterationJob[];
}
```

#### Party Member Model
```typescript
interface PartyMember {
  id: number;
  partyId: number;
  customerId: number;
  role: string;                   // "Groom", "Bride", "Best Man", etc.
  isPrimary: boolean;             // Primary contact for the party
  measurements?: Json;            // Stored measurements
  notes?: string;                 // Member-specific notes
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  party: Party;
  customer: Customer;
  appointments: Appointment[];
  alterationJobs: AlterationJob[];
}
```

### Event Types

#### Supported Event Types
- **WEDDING**: Wedding parties with multiple participants
- **PROM**: Prom events with groups of students
- **CORPORATE**: Corporate events and functions
- **QUINCEANERA**: Traditional coming-of-age celebrations
- **BAR_MITZVAH**: Jewish coming-of-age ceremonies
- **OTHER**: Custom event types

#### Event Type Configuration
```typescript
enum EventType {
  WEDDING = 'WEDDING',
  PROM = 'PROM',
  CORPORATE = 'CORPORATE',
  QUINCEANERA = 'QUINCEANERA',
  BAR_MITZVAH = 'BAR_MITZVAH',
  OTHER = 'OTHER'
}
```

### Party Status Management

#### Status Progression
```
PLANNING → ACTIVE → COMPLETED
    ↓
CANCELLED
```

#### Status Definitions
- **PLANNING**: Initial planning phase, members being added
- **ACTIVE**: Party is active, appointments and alterations in progress
- **COMPLETED**: Event has occurred, all work completed
- **CANCELLED**: Event cancelled, no further work needed

## Party Creation

### Creation Workflow

#### 1. Basic Party Information
```typescript
interface PartyCreationData {
  name: string;                   // Party name
  eventType: EventType;          // Type of event
  eventDate: Date;               // Event date
  notes?: string;                // Initial notes
}
```

#### 2. Member Addition
```typescript
interface PartyMemberData {
  customerId: number;            // Existing customer ID
  role: string;                  // Role in the party
  isPrimary: boolean;            // Primary contact flag
  notes?: string;                // Member-specific notes
}
```

#### 3. Event Configuration
```typescript
interface EventConfiguration {
  eventDate: Date;               // Primary event date
  rehearsalDate?: Date;          // Rehearsal date (weddings)
  pickupDate?: Date;             // Final pickup date
  specialRequirements?: string;  // Special requirements
}
```

### Creation Examples

#### Wedding Party Creation
```typescript
const weddingParty = {
  name: "Smith Wedding",
  eventType: "WEDDING",
  eventDate: new Date("2024-06-15"),
  notes: "Outdoor wedding at Riverside Gardens",
  members: [
    {
      customerId: 123,
      role: "Groom",
      isPrimary: true,
      notes: "Navy suit with vest"
    },
    {
      customerId: 124,
      role: "Bride",
      isPrimary: false,
      notes: "White wedding dress"
    },
    {
      customerId: 125,
      role: "Best Man",
      isPrimary: false,
      notes: "Matching navy suit"
    }
  ]
};
```

#### Prom Party Creation
```typescript
const promParty = {
  name: "Senior Prom 2024",
  eventType: "PROM",
  eventDate: new Date("2024-05-18"),
  notes: "School prom at Grand Hotel",
  members: [
    {
      customerId: 201,
      role: "Student",
      isPrimary: true,
      notes: "Black tuxedo"
    },
    {
      customerId: 202,
      role: "Date",
      isPrimary: false,
      notes: "Formal dress"
    }
  ]
};
```

## Party Member Management

### Member Operations

#### Add Member
```typescript
async function addPartyMember(partyId: number, memberData: PartyMemberData): Promise<PartyMember> {
  // Validate customer exists
  const customer = await prisma.customer.findUnique({
    where: { id: memberData.customerId }
  });
  
  if (!customer) {
    throw new Error('Customer not found');
  }
  
  // Check if customer is already in party
  const existingMember = await prisma.partyMember.findFirst({
    where: {
      partyId,
      customerId: memberData.customerId
    }
  });
  
  if (existingMember) {
    throw new Error('Customer is already a member of this party');
  }
  
  // Add member
  return await prisma.partyMember.create({
    data: {
      partyId,
      customerId: memberData.customerId,
      role: memberData.role,
      isPrimary: memberData.isPrimary,
      notes: memberData.notes
    },
    include: {
      customer: true,
      party: true
    }
  });
}
```

#### Update Member
```typescript
async function updatePartyMember(memberId: number, updates: Partial<PartyMemberData>): Promise<PartyMember> {
  return await prisma.partyMember.update({
    where: { id: memberId },
    data: updates,
    include: {
      customer: true,
      party: true
    }
  });
}
```

#### Remove Member
```typescript
async function removePartyMember(memberId: number): Promise<void> {
  // Check if member has active appointments or alterations
  const member = await prisma.partyMember.findUnique({
    where: { id: memberId },
    include: {
      appointments: true,
      alterationJobs: true
    }
  });
  
  if (member?.appointments.length > 0 || member?.alterationJobs.length > 0) {
    throw new Error('Cannot remove member with active appointments or alterations');
  }
  
  await prisma.partyMember.delete({
    where: { id: memberId }
  });
}
```

### Member Roles

#### Wedding Roles
- **Groom**: Primary male participant
- **Bride**: Primary female participant
- **Best Man**: Groom's primary attendant
- **Maid of Honor**: Bride's primary attendant
- **Bridesmaid**: Bride's attendant
- **Groomsman**: Groom's attendant
- **Father of the Bride**: Bride's father
- **Mother of the Bride**: Bride's mother
- **Father of the Groom**: Groom's father
- **Mother of the Groom**: Groom's mother
- **Ring Bearer**: Child carrying rings
- **Flower Girl**: Child scattering flowers

#### Prom Roles
- **Student**: Primary student
- **Date**: Student's date
- **Group Member**: Part of larger group

#### Corporate Roles
- **Employee**: Company employee
- **Guest**: Corporate guest
- **Speaker**: Event speaker
- **Organizer**: Event organizer

## Event Management

### Event Configuration

#### Event Timeline
```typescript
interface EventTimeline {
  eventDate: Date;               // Primary event date
  rehearsalDate?: Date;          // Rehearsal date
  fittingDate?: Date;            // Group fitting date
  pickupDate?: Date;             // Final pickup date
  alterationsDueDate?: Date;     // Alterations completion date
}
```

#### Event Requirements
```typescript
interface EventRequirements {
  dressCode: string;             // "Formal", "Black Tie", "Business Casual"
  colorScheme?: string;          // "Navy and Gold", "Black and White"
  specialInstructions?: string;  // Special requirements
  venue?: string;                // Event venue
  coordinator?: string;          // Event coordinator contact
}
```

### Event Coordination

#### Timeline Management
```typescript
async function createEventTimeline(partyId: number, timeline: EventTimeline): Promise<void> {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { members: true }
  });
  
  if (!party) {
    throw new Error('Party not found');
  }
  
  // Create appointments for all members
  for (const member of party.members) {
    if (timeline.fittingDate) {
      await createAppointment({
        customerId: member.customerId,
        partyId: partyId,
        partyMemberId: member.id,
        dateTime: timeline.fittingDate,
        type: 'FITTING',
        notes: `Group fitting for ${party.name}`
      });
    }
    
    if (timeline.pickupDate) {
      await createAppointment({
        customerId: member.customerId,
        partyId: partyId,
        partyMemberId: member.id,
        dateTime: timeline.pickupDate,
        type: 'PICKUP',
        notes: `Final pickup for ${party.name}`
      });
    }
  }
}
```

#### Coordination Tools
- **Group Messaging**: Send messages to all party members
- **Schedule Coordination**: Coordinate appointments across members
- **Status Tracking**: Track progress for all party members
- **Payment Management**: Handle group payments and deposits

## Appointment Coordination

### Group Appointment Management

#### Batch Appointment Creation
```typescript
async function createGroupAppointments(partyId: number, appointmentData: GroupAppointmentData): Promise<Appointment[]> {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { members: true }
  });
  
  if (!party) {
    throw new Error('Party not found');
  }
  
  const appointments = [];
  
  for (const member of party.members) {
    const appointment = await prisma.appointment.create({
      data: {
        customerId: member.customerId,
        partyId: partyId,
        partyMemberId: member.id,
        dateTime: appointmentData.dateTime,
        type: appointmentData.type,
        notes: `${appointmentData.notes} - ${member.role}`,
        tailorId: appointmentData.tailorId
      }
    });
    
    appointments.push(appointment);
  }
  
  return appointments;
}
```

#### Appointment Types
- **CONSULTATION**: Initial consultation for the party
- **FITTING**: Group fitting session
- **ALTERATION**: Individual alteration appointments
- **PICKUP**: Final pickup appointments
- **REHEARSAL**: Rehearsal day appointments

### Scheduling Coordination

#### Conflict Detection
```typescript
async function detectSchedulingConflicts(partyId: number, proposedDateTime: Date): Promise<Conflict[]> {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: {
      members: {
        include: {
          appointments: true
        }
      }
    }
  });
  
  const conflicts = [];
  
  for (const member of party?.members || []) {
    for (const appointment of member.appointments) {
      const timeDiff = Math.abs(appointment.dateTime.getTime() - proposedDateTime.getTime());
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (hoursDiff < 2) { // 2-hour buffer
        conflicts.push({
          member: member.customer.name,
          role: member.role,
          existingAppointment: appointment,
          conflictType: 'TIME_OVERLAP'
        });
      }
    }
  }
  
  return conflicts;
}
```

## Alteration Integration

### Party Alteration Management

#### Group Alteration Creation
```typescript
async function createPartyAlterations(partyId: number, alterationData: PartyAlterationData): Promise<AlterationJob[]> {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { members: true }
  });
  
  if (!party) {
    throw new Error('Party not found');
  }
  
  const alterationJobs = [];
  
  for (const member of party.members) {
    const alterationJob = await prisma.alterationJob.create({
      data: {
        customerId: member.customerId,
        partyId: partyId,
        partyMemberId: member.id,
        orderStatus: 'ALTERATION_ONLY',
        dueDate: party.eventDate,
        rushOrder: false,
        notes: `${party.name} - ${member.role}`,
        jobParts: {
          create: alterationData.jobParts.map(part => ({
            ...part,
            notes: `${part.notes} - ${member.role}`
          }))
        }
      }
    });
    
    alterationJobs.push(alterationJob);
  }
  
  return alterationJobs;
}
```

#### Alteration Coordination
- **Group Deadlines**: Coordinate due dates across all members
- **Priority Management**: Prioritize based on event date
- **Status Tracking**: Track progress for all party alterations
- **Quality Control**: Ensure all alterations meet event requirements

## API Endpoints

### Party Management

#### Create Party
```http
POST /api/parties
```

#### Request Body
```json
{
  "name": "Smith Wedding",
  "eventType": "WEDDING",
  "eventDate": "2024-06-15",
  "notes": "Outdoor wedding at Riverside Gardens",
  "members": [
    {
      "customerId": 123,
      "role": "Groom",
      "isPrimary": true,
      "notes": "Navy suit with vest"
    },
    {
      "customerId": 124,
      "role": "Bride",
      "isPrimary": false,
      "notes": "White wedding dress"
    }
  ]
}
```

#### Response
```json
{
  "success": true,
  "party": {
    "id": 1,
    "name": "Smith Wedding",
    "eventType": "WEDDING",
    "eventDate": "2024-06-15T00:00:00.000Z",
    "status": "PLANNING",
    "members": [
      {
        "id": 1,
        "role": "Groom",
        "isPrimary": true,
        "customer": {
          "id": 123,
          "name": "John Smith"
        }
      }
    ]
  }
}
```

#### Get Party
```http
GET /api/parties/:partyId
```

#### Response
```json
{
  "id": 1,
  "name": "Smith Wedding",
  "eventType": "WEDDING",
  "eventDate": "2024-06-15T00:00:00.000Z",
  "status": "ACTIVE",
  "notes": "Outdoor wedding at Riverside Gardens",
  "members": [
    {
      "id": 1,
      "role": "Groom",
      "isPrimary": true,
      "customer": {
        "id": 123,
        "name": "John Smith",
        "phone": "555-123-4567"
      },
      "appointments": [
        {
          "id": 1,
          "dateTime": "2024-06-10T14:00:00.000Z",
          "type": "FITTING",
          "status": "CONFIRMED"
        }
      ],
      "alterationJobs": [
        {
          "id": 1,
          "jobNumber": "ALT-2024-001",
          "status": "IN_PROGRESS"
        }
      ]
    }
  ],
  "appointments": [
    {
      "id": 1,
      "dateTime": "2024-06-10T14:00:00.000Z",
      "type": "FITTING",
      "customer": {
        "name": "John Smith"
      }
    }
  ]
}
```

### Member Management

#### Add Member
```http
POST /api/parties/:partyId/members
```

#### Request Body
```json
{
  "customerId": 125,
  "role": "Best Man",
  "isPrimary": false,
  "notes": "Matching navy suit"
}
```

#### Update Member
```http
PUT /api/parties/:partyId/members/:memberId
```

#### Request Body
```json
{
  "role": "Best Man",
  "notes": "Updated notes for best man"
}
```

#### Remove Member
```http
DELETE /api/parties/:partyId/members/:memberId
```

### Event Management

#### Create Group Appointments
```http
POST /api/parties/:partyId/appointments
```

#### Request Body
```json
{
  "dateTime": "2024-06-10T14:00:00.000Z",
  "type": "FITTING",
  "notes": "Group fitting for wedding party",
  "tailorId": 5
}
```

#### Get Party Timeline
```http
GET /api/parties/:partyId/timeline
```

#### Response
```json
{
  "success": true,
  "timeline": {
    "eventDate": "2024-06-15T00:00:00.000Z",
    "rehearsalDate": "2024-06-14T18:00:00.000Z",
    "fittingDate": "2024-06-10T14:00:00.000Z",
    "pickupDate": "2024-06-13T16:00:00.000Z",
    "alterationsDueDate": "2024-06-12T00:00:00.000Z"
  },
  "appointments": [
    {
      "id": 1,
      "dateTime": "2024-06-10T14:00:00.000Z",
      "type": "FITTING",
      "customer": {
        "name": "John Smith"
      },
      "status": "CONFIRMED"
    }
  ]
}
```

## Frontend Integration

### Party Management Components

#### PartyCreationModal
```typescript
interface PartyCreationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (party: Party) => void;
}
```

#### PartyMemberManagement
```typescript
interface PartyMemberManagementProps {
  party: Party;
  onMemberAdded: (member: PartyMember) => void;
  onMemberUpdated: (member: PartyMember) => void;
  onMemberRemoved: (memberId: number) => void;
}
```

#### PartyTimeline
```typescript
interface PartyTimelineProps {
  party: Party;
  onTimelineUpdated: (timeline: EventTimeline) => void;
}
```

### Form Components

#### Party Creation Form
```typescript
const partyCreationSchema = z.object({
  name: z.string().min(1, 'Party name is required'),
  eventType: z.enum(['WEDDING', 'PROM', 'CORPORATE', 'OTHER']),
  eventDate: z.date().min(new Date(), 'Event date must be in the future'),
  notes: z.string().optional(),
  members: z.array(z.object({
    customerId: z.number().positive(),
    role: z.string().min(1, 'Role is required'),
    isPrimary: z.boolean(),
    notes: z.string().optional()
  })).min(1, 'At least one member is required')
});
```

#### Member Selection
```typescript
interface MemberSelectionProps {
  onMemberSelected: (customer: Customer) => void;
  excludeCustomerIds?: number[];
}
```

## Reporting and Analytics

### Party Analytics

#### Event Performance
```typescript
interface PartyAnalytics {
  totalParties: number;
  activeParties: number;
  completedParties: number;
  averageMembersPerParty: number;
  averageRevenuePerParty: number;
  eventTypeDistribution: Record<EventType, number>;
}
```

#### Member Analytics
```typescript
interface MemberAnalytics {
  totalMembers: number;
  averageAppointmentsPerMember: number;
  averageAlterationsPerMember: number;
  roleDistribution: Record<string, number>;
  completionRates: Record<string, number>;
}
```

### Reporting Functions

#### Generate Party Report
```typescript
async function generatePartyReport(partyId: number): Promise<PartyReport> {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: {
      members: {
        include: {
          customer: true,
          appointments: true,
          alterationJobs: {
            include: {
              jobParts: true
            }
          }
        }
      }
    }
  });
  
  return {
    partyInfo: {
      name: party.name,
      eventType: party.eventType,
      eventDate: party.eventDate,
      status: party.status
    },
    memberSummary: {
      totalMembers: party.members.length,
      primaryContact: party.members.find(m => m.isPrimary)?.customer.name,
      roles: party.members.map(m => m.role)
    },
    appointmentSummary: {
      totalAppointments: party.members.reduce((sum, m) => sum + m.appointments.length, 0),
      confirmedAppointments: party.members.reduce((sum, m) => 
        sum + m.appointments.filter(a => a.status === 'CONFIRMED').length, 0),
      upcomingAppointments: party.members.reduce((sum, m) => 
        sum + m.appointments.filter(a => a.dateTime > new Date()).length, 0)
    },
    alterationSummary: {
      totalJobs: party.members.reduce((sum, m) => sum + m.alterationJobs.length, 0),
      completedJobs: party.members.reduce((sum, m) => 
        sum + m.alterationJobs.filter(j => j.status === 'COMPLETE').length, 0),
      inProgressJobs: party.members.reduce((sum, m) => 
        sum + m.alterationJobs.filter(j => j.status === 'IN_PROGRESS').length, 0)
    }
  };
}
```

## Best Practices

### Party Organization

#### Naming Conventions
- **Wedding Parties**: "Smith Wedding", "Johnson Wedding"
- **Prom Parties**: "Senior Prom 2024", "Junior Prom 2024"
- **Corporate Events**: "Annual Gala 2024", "Board Meeting"
- **Custom Events**: "Quinceanera - Maria Garcia"

#### Member Management
- **Primary Contact**: Always designate a primary contact
- **Role Assignment**: Use consistent role names
- **Contact Information**: Keep all contact information updated
- **Notes**: Use notes for special requirements

### Event Coordination

#### Timeline Management
- **Early Planning**: Start planning 6-8 weeks before event
- **Fitting Schedule**: Schedule fittings 2-3 weeks before event
- **Alteration Deadlines**: Complete alterations 1 week before event
- **Pickup Schedule**: Schedule pickups 1-2 days before event

#### Communication
- **Group Updates**: Send updates to all party members
- **Individual Contact**: Maintain individual communication
- **Status Updates**: Regular status updates on progress
- **Emergency Contacts**: Maintain emergency contact information

### Data Management

#### Data Integrity
- **Customer Validation**: Ensure all customers exist before adding
- **Duplicate Prevention**: Prevent duplicate member additions
- **Status Tracking**: Maintain accurate status information
- **Audit Trail**: Keep complete audit trail of changes

#### Performance Optimization
- **Efficient Queries**: Use optimized database queries
- **Caching**: Cache frequently accessed party data
- **Batch Operations**: Use batch operations for multiple updates
- **Indexing**: Proper database indexing for performance

## Examples

### Wedding Party Example

#### Party Creation
```typescript
const weddingParty = {
  name: "Smith Wedding",
  eventType: "WEDDING",
  eventDate: new Date("2024-06-15"),
  notes: "Outdoor wedding at Riverside Gardens, navy and gold theme",
  members: [
    {
      customerId: 123,
      role: "Groom",
      isPrimary: true,
      notes: "Navy suit with gold vest, needs alterations"
    },
    {
      customerId: 124,
      role: "Bride",
      isPrimary: false,
      notes: "White wedding dress, needs hemming"
    },
    {
      customerId: 125,
      role: "Best Man",
      isPrimary: false,
      notes: "Matching navy suit"
    },
    {
      customerId: 126,
      role: "Maid of Honor",
      isPrimary: false,
      notes: "Gold bridesmaid dress"
    }
  ]
};
```

#### Timeline Management
```typescript
const weddingTimeline = {
  eventDate: new Date("2024-06-15"),
  rehearsalDate: new Date("2024-06-14"),
  fittingDate: new Date("2024-06-10"),
  pickupDate: new Date("2024-06-13"),
  alterationsDueDate: new Date("2024-06-12")
};
```

### Prom Party Example

#### Party Creation
```typescript
const promParty = {
  name: "Senior Prom 2024",
  eventType: "PROM",
  eventDate: new Date("2024-05-18"),
  notes: "School prom at Grand Hotel, black tie optional",
  members: [
    {
      customerId: 201,
      role: "Student",
      isPrimary: true,
      notes: "Black tuxedo rental"
    },
    {
      customerId: 202,
      role: "Date",
      isPrimary: false,
      notes: "Formal dress purchase"
    }
  ]
};
```

### Corporate Event Example

#### Party Creation
```typescript
const corporateParty = {
  name: "Annual Gala 2024",
  eventType: "CORPORATE",
  eventDate: new Date("2024-12-15"),
  notes: "Annual corporate gala, business formal attire",
  members: [
    {
      customerId: 301,
      role: "CEO",
      isPrimary: true,
      notes: "Custom tuxedo for keynote speech"
    },
    {
      customerId: 302,
      role: "Employee",
      isPrimary: false,
      notes: "Business suit rental"
    },
    {
      customerId: 303,
      role: "Guest Speaker",
      isPrimary: false,
      notes: "Formal business attire"
    }
  ]
};
```

## Conclusion

The Party Creation and Management system provides comprehensive functionality for managing group events and coordinating multiple customers. It enables efficient event planning, member management, and coordination of appointments and alterations.

Key benefits include:
- **Group Coordination**: Efficient management of multiple participants
- **Event Planning**: Comprehensive event timeline management
- **Member Management**: Flexible member addition and role assignment
- **Integration**: Seamless integration with appointments and alterations
- **Reporting**: Comprehensive analytics and reporting capabilities

The system is designed to handle various event types and scales, from small prom groups to large wedding parties, providing the tools needed for successful event coordination and customer management. 
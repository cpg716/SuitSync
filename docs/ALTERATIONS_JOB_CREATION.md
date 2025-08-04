# Alterations Job Creation Documentation

## Overview

The Alterations Job Creation system provides a comprehensive workflow for creating and managing alteration jobs in SuitSync. It supports complex multi-garment jobs with detailed task tracking, priority management, and integration with the broader business workflow.

## Table of Contents

1. [Job Creation Workflow](#job-creation-workflow)
2. [Job Structure](#job-structure)
3. [Garment Parts](#garment-parts)
4. [Task Management](#task-management)
5. [Priority and Scheduling](#priority-and-scheduling)
6. [API Endpoints](#api-endpoints)
7. [Frontend Integration](#frontend-integration)
8. [Validation and Error Handling](#validation-and-error-handling)
9. [Best Practices](#best-practices)
10. [Examples](#examples)

## Job Creation Workflow

### 1. Pre-Creation Setup

#### Customer Information
- **Customer ID**: Link to existing customer in system
- **Party ID**: Optional link to wedding/event party
- **Party Member ID**: Specific member within party
- **Contact Information**: Phone, email for notifications

#### Business Context
- **Order Status**: ALTERATION_ONLY, ORDERED, IN_STOCK
- **Rush Order**: Boolean flag for priority processing
- **Due Date**: Target completion date
- **Notes**: Additional context and instructions

### 2. Job Structure Definition

#### Main Job Container
```typescript
interface AlterationJob {
  id: number;
  jobNumber: string;           // Auto-generated: ALT-YYYY-NNN
  customerId: number;
  partyId?: number;
  partyMemberId?: number;
  orderStatus: OrderStatus;
  status: AlterationJobStatus;
  dueDate: Date;
  rushOrder: boolean;
  notes?: string;
  timeSpentMinutes?: number;
  tailorId?: number;
  receivedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Job Parts (Garments)
```typescript
interface AlterationJobPart {
  id: number;
  jobId: number;
  partName: string;            // Human-readable name
  partType: GarmentPartType;   // JACKET, PANTS, VEST, etc.
  status: AlterationJobStatus;
  assignedTo?: number;         // Tailor ID
  qrCode: string;              // Auto-generated unique QR
  estimatedTime?: number;      // Minutes
  priority: PartPriority;
  notes?: string;
  tasks: AlterationTask[];
}
```

#### Tasks (Specific Work)
```typescript
interface AlterationTask {
  id: number;
  partId: number;
  taskName: string;            // "Shorten Sleeves", "Hem", etc.
  taskType: TaskType;          // ALTERATION, BUTTON_WORK, etc.
  status: AlterationJobStatus;
  assignedTo?: number;         // Tailor ID
  startTime?: Date;
  finishTime?: Date;
  timeSpent?: number;          // Minutes
  initials?: string;           // Tailor signature
  measurements?: string;       // Specific measurements
  notes?: string;
}
```

## Job Structure

### Hierarchical Organization

```
AlterationJob
├── Customer Information
├── Party/Event Context
├── Business Details (Status, Priority, Due Date)
└── Job Parts (Garments)
    ├── Part Details (Name, Type, Priority)
    ├── Assignment Information
    └── Tasks (Specific Work Items)
        ├── Task Details (Name, Type, Measurements)
        ├── Assignment and Tracking
        └── Completion Information
```

### Auto-Generated Fields

#### Job Number
- **Format**: `ALT-YYYY-NNN`
- **Example**: `ALT-2024-001`
- **Generation**: Automatic sequential numbering
- **Uniqueness**: Guaranteed unique across system

#### QR Codes
- **Format**: `QR-PART-{timestamp}-{random}`
- **Example**: `QR-PART-1703123456789-abc123def`
- **Purpose**: Unique identifier for scanning
- **Scope**: One per job part

#### Timestamps
- **receivedDate**: When job was created
- **createdAt**: Database record creation
- **updatedAt**: Last modification
- **startTime**: When work began on task
- **finishTime**: When work completed on task

## Garment Parts

### Supported Garment Types

#### Primary Garments
- **JACKET**: Suit jackets, blazers, sport coats
- **PANTS**: Trousers, slacks, dress pants
- **VEST**: Waistcoats, vests, cummerbunds
- **SHIRT**: Dress shirts, casual shirts, formal shirts

#### Extended Garments
- **DRESS**: Dresses, gowns, formal wear
- **SKIRT**: Skirts, kilts, formal skirts
- **OTHER**: Unusual or custom garments

### Part Configuration

#### Part Name
- **Format**: Descriptive name with context
- **Examples**: 
  - "Navy Suit Jacket"
  - "Black Tuxedo Pants"
  - "White Wedding Shirt"
  - "Charcoal Vest"

#### Part Type
- **Purpose**: Categorization and filtering
- **Impact**: Affects available tasks and tailor assignments
- **Validation**: Must match supported garment types

#### Priority Levels
- **LOW**: Standard alterations, no rush
- **NORMAL**: Regular business, standard timeline
- **HIGH**: Important events, expedited processing
- **RUSH**: Urgent orders, immediate attention

## Task Management

### Task Categories

#### Alteration Tasks
- **Type**: `ALTERATION`
- **Examples**:
  - Shorten Sleeves
  - Hem Pants
  - Take in Sides
  - Let out Waist
  - Adjust Shoulders
  - Taper Legs

#### Button Work
- **Type**: `BUTTON_WORK`
- **Examples**:
  - Replace Buttons
  - Add Hook & Eye
  - Repair Buttonholes
  - Add Cuff Buttons
  - Replace Zipper

#### Measurement Tasks
- **Type**: `MEASUREMENT`
- **Examples**:
  - Initial Measurements
  - Fitting Measurements
  - Final Measurements
  - Adjustment Measurements

#### Custom Tasks
- **Type**: `CUSTOM`
- **Examples**:
  - Special Alterations
  - Custom Modifications
  - Repair Work
  - Special Requests

### Task Configuration

#### Task Name
- **Format**: Clear, descriptive action
- **Examples**:
  - "Shorten Sleeves by 1.5 inches"
  - "Hem to 32 inch inseam"
  - "Replace all buttons with mother-of-pearl"

#### Measurements
- **Format**: Specific measurements for the task
- **Examples**:
  - "1.5 inches"
  - "32 inch inseam"
  - "2 inches from shoulder"
  - "Waist 34, Length 30"

#### Notes
- **Purpose**: Additional context and instructions
- **Examples**:
  - "Customer prefers natural break"
  - "Match existing button style"
  - "Preserve original hem"

## Priority and Scheduling

### Priority Assignment

#### Factors Considered
- **Event Date**: Wedding, prom, business meeting
- **Customer Type**: VIP, regular, new customer
- **Order Value**: High-value orders get priority
- **Business Impact**: Rush fees, customer satisfaction

#### Priority Logic
```typescript
function calculatePriority(job: AlterationJob): PartPriority {
  if (job.rushOrder) return 'RUSH';
  if (job.dueDate && daysUntil(job.dueDate) <= 3) return 'HIGH';
  if (job.dueDate && daysUntil(job.dueDate) <= 7) return 'NORMAL';
  return 'LOW';
}
```

### Scheduling Integration

#### Due Date Management
- **Event Date**: Primary due date for weddings/events
- **Fitting Date**: Intermediate milestone
- **Pickup Date**: Final delivery target
- **Buffer Time**: Additional time for quality control

#### Capacity Planning
- **Estimated Time**: Total time for all tasks
- **Tailor Availability**: Check available tailors
- **Workload Distribution**: Balance across team
- **Rush Order Impact**: Effect on regular orders

## API Endpoints

### Create Alteration Job

#### Endpoint
```http
POST /api/alterations
```

#### Request Body
```json
{
  "customerId": 1,
  "partyId": 5,
  "partyMemberId": 12,
  "orderStatus": "ALTERATION_ONLY",
  "dueDate": "2024-12-08",
  "rushOrder": false,
  "notes": "Wedding suit alterations for groom",
  "jobParts": [
    {
      "partName": "Navy Suit Jacket",
      "partType": "JACKET",
      "priority": "HIGH",
      "estimatedTime": 120,
      "notes": "Wedding jacket - customer prefers natural break",
      "tasks": [
        {
          "taskName": "Shorten Sleeves",
          "taskType": "alteration",
          "measurements": "1.5 inches",
          "notes": "Customer has shorter arms"
        },
        {
          "taskName": "Button Replacement",
          "taskType": "button_work",
          "measurements": "",
          "notes": "Replace with mother-of-pearl buttons"
        }
      ]
    },
    {
      "partName": "Navy Suit Pants",
      "partType": "PANTS",
      "priority": "HIGH",
      "estimatedTime": 90,
      "notes": "Wedding pants",
      "tasks": [
        {
          "taskName": "Hem",
          "taskType": "alteration",
          "measurements": "32 inch inseam",
          "notes": "Customer prefers no break"
        },
        {
          "taskName": "Hook & Eye",
          "taskType": "button_work",
          "measurements": "",
          "notes": "Add hook and eye closure"
        }
      ]
    }
  ]
}
```

#### Response
```json
{
  "success": true,
  "alterationJob": {
    "id": 123,
    "jobNumber": "ALT-2024-001",
    "status": "NOT_STARTED",
    "customerId": 1,
    "partyId": 5,
    "dueDate": "2024-12-08T00:00:00.000Z",
    "rushOrder": false,
    "receivedDate": "2024-12-01T10:30:00.000Z"
  },
  "jobParts": [
    {
      "id": 456,
      "partName": "Navy Suit Jacket",
      "partType": "JACKET",
      "status": "NOT_STARTED",
      "qrCode": "QR-PART-1703123456789-abc123def",
      "priority": "HIGH",
      "estimatedTime": 120
    },
    {
      "id": 457,
      "partName": "Navy Suit Pants",
      "partType": "PANTS",
      "status": "NOT_STARTED",
      "qrCode": "QR-PART-1703123456790-def456ghi",
      "priority": "HIGH",
      "estimatedTime": 90
    }
  ],
  "message": "Alteration job created successfully"
}
```

### Get Alteration Job

#### Endpoint
```http
GET /api/alterations/jobs/:jobId
```

#### Response
```json
{
  "id": 123,
  "jobNumber": "ALT-2024-001",
  "status": "IN_PROGRESS",
  "customer": {
    "id": 1,
    "name": "John Smith",
    "phone": "555-123-4567"
  },
  "party": {
    "id": 5,
    "name": "Smith Wedding",
    "eventDate": "2024-12-08"
  },
  "dueDate": "2024-12-08T00:00:00.000Z",
  "rushOrder": false,
  "jobParts": [
    {
      "id": 456,
      "partName": "Navy Suit Jacket",
      "partType": "JACKET",
      "status": "IN_PROGRESS",
      "assignedUser": {
        "id": 5,
        "name": "Mike Johnson"
      },
      "tasks": [
        {
          "id": 789,
          "taskName": "Shorten Sleeves",
          "taskType": "ALTERATION",
          "status": "COMPLETE",
          "assignedUser": {
            "id": 5,
            "name": "Mike Johnson"
          },
          "startTime": "2024-12-01T09:00:00.000Z",
          "finishTime": "2024-12-01T10:30:00.000Z",
          "timeSpent": 90,
          "initials": "MJ"
        }
      ]
    }
  ]
}
```

## Frontend Integration

### Job Creation Form

#### Form Structure
```typescript
interface JobCreationForm {
  // Customer Information
  customerId: number;
  partyId?: number;
  partyMemberId?: number;
  
  // Job Details
  orderStatus: OrderStatus;
  dueDate: Date;
  rushOrder: boolean;
  notes: string;
  
  // Job Parts
  jobParts: JobPartForm[];
}

interface JobPartForm {
  partName: string;
  partType: GarmentPartType;
  priority: PartPriority;
  estimatedTime?: number;
  notes?: string;
  tasks: TaskForm[];
}

interface TaskForm {
  taskName: string;
  taskType: TaskType;
  measurements?: string;
  notes?: string;
}
```

#### Form Validation
```typescript
const jobValidationSchema = z.object({
  customerId: z.number().positive(),
  partyId: z.number().optional(),
  orderStatus: z.enum(['ALTERATION_ONLY', 'ORDERED', 'IN_STOCK']),
  dueDate: z.date().min(new Date()),
  rushOrder: z.boolean(),
  notes: z.string().max(500),
  jobParts: z.array(partValidationSchema).min(1)
});
```

### UI Components

#### Job Creation Modal
- **Customer Selection**: Dropdown with search
- **Party Selection**: Optional party picker
- **Job Details**: Form for basic information
- **Parts Management**: Dynamic list of garment parts
- **Task Management**: Nested task configuration
- **Validation**: Real-time form validation
- **Submission**: Create job with loading states

#### Part Management
- **Add Part**: Button to add new garment part
- **Part Configuration**: Form for part details
- **Task List**: Dynamic list of tasks per part
- **Remove Part**: Delete part with confirmation
- **Reorder**: Drag and drop for part ordering

#### Task Management
- **Add Task**: Button to add new task
- **Task Type**: Dropdown for task categories
- **Task Name**: Text input with suggestions
- **Measurements**: Optional measurement input
- **Remove Task**: Delete task with confirmation

## Validation and Error Handling

### Input Validation

#### Required Fields
- **customerId**: Must be valid customer ID
- **orderStatus**: Must be valid enum value
- **dueDate**: Must be future date
- **jobParts**: Must have at least one part
- **partName**: Must be non-empty string
- **partType**: Must be valid garment type
- **tasks**: Each part must have at least one task
- **taskName**: Must be non-empty string
- **taskType**: Must be valid task type

#### Business Rules
- **Due Date**: Must be after current date
- **Estimated Time**: Must be positive number
- **Priority**: Rush orders get HIGH priority
- **Task Types**: Must match garment type capabilities
- **Customer**: Must exist and be active
- **Party**: Must exist if partyId provided

### Error Handling

#### Validation Errors
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "customerId",
      "message": "Customer not found"
    },
    {
      "field": "jobParts[0].tasks",
      "message": "At least one task is required"
    }
  ]
}
```

#### Business Logic Errors
```json
{
  "error": "Cannot create job",
  "reason": "Customer has outstanding balance",
  "code": "CUSTOMER_BALANCE_DUE"
}
```

#### System Errors
```json
{
  "error": "Internal server error",
  "message": "Failed to create alteration job",
  "code": "DATABASE_ERROR"
}
```

## Best Practices

### Job Creation Guidelines

#### Customer Information
- **Verify Customer**: Ensure customer exists and is active
- **Check Balance**: Verify no outstanding balances
- **Update Contact**: Confirm current contact information
- **Link Party**: Connect to wedding/event if applicable

#### Job Structure
- **Clear Naming**: Use descriptive part names
- **Logical Order**: Arrange parts in logical sequence
- **Complete Tasks**: Include all necessary alterations
- **Detailed Notes**: Provide context for tailors

#### Priority Management
- **Event-Based**: Prioritize by event date
- **Customer Type**: VIP customers get priority
- **Rush Fees**: Apply rush fees for expedited service
- **Capacity Planning**: Consider current workload

### Task Configuration

#### Task Naming
- **Specific Actions**: "Shorten Sleeves" not "Fix"
- **Measurements**: Include specific measurements
- **Context**: Add relevant context in notes
- **Consistency**: Use standard task names

#### Measurement Documentation
- **Precise Values**: Use exact measurements
- **Units**: Specify units (inches, cm)
- **Reference Points**: Note measurement reference points
- **Customer Preferences**: Document customer preferences

### Quality Assurance

#### Pre-Creation Review
- **Customer Verification**: Confirm customer details
- **Requirements Review**: Verify all requirements captured
- **Timeline Check**: Ensure realistic due date
- **Resource Check**: Confirm available capacity

#### Post-Creation Validation
- **Job Number**: Verify auto-generated job number
- **QR Codes**: Confirm QR codes generated
- **Task Assignment**: Check all tasks created
- **Notification**: Send confirmation to customer

## Examples

### Wedding Suit Alterations

#### Job Creation
```json
{
  "customerId": 123,
  "partyId": 456,
  "partyMemberId": 789,
  "orderStatus": "ALTERATION_ONLY",
  "dueDate": "2024-06-15",
  "rushOrder": false,
  "notes": "Groom's wedding suit - wedding on June 20th",
  "jobParts": [
    {
      "partName": "Navy Suit Jacket",
      "partType": "JACKET",
      "priority": "HIGH",
      "estimatedTime": 120,
      "notes": "Wedding jacket - customer prefers natural break",
      "tasks": [
        {
          "taskName": "Shorten Sleeves",
          "taskType": "alteration",
          "measurements": "1.5 inches",
          "notes": "Customer has shorter arms, show 0.5 inch of shirt cuff"
        },
        {
          "taskName": "Take in Sides",
          "taskType": "alteration",
          "measurements": "1 inch on each side",
          "notes": "Customer lost weight, needs tighter fit"
        },
        {
          "taskName": "Button Replacement",
          "taskType": "button_work",
          "measurements": "",
          "notes": "Replace with mother-of-pearl buttons to match wedding theme"
        }
      ]
    },
    {
      "partName": "Navy Suit Pants",
      "partType": "PANTS",
      "priority": "HIGH",
      "estimatedTime": 90,
      "notes": "Wedding pants",
      "tasks": [
        {
          "taskName": "Hem",
          "taskType": "alteration",
          "measurements": "32 inch inseam",
          "notes": "Customer prefers no break, hem to exact length"
        },
        {
          "taskName": "Take in Waist",
          "taskType": "alteration",
          "measurements": "2 inches",
          "notes": "Customer lost weight, needs waist taken in"
        },
        {
          "taskName": "Hook & Eye",
          "taskType": "button_work",
          "measurements": "",
          "notes": "Add hook and eye closure for security"
        }
      ]
    },
    {
      "partName": "White Dress Shirt",
      "partType": "SHIRT",
      "priority": "HIGH",
      "estimatedTime": 60,
      "notes": "Wedding shirt",
      "tasks": [
        {
          "taskName": "Shorten Sleeves",
          "taskType": "alteration",
          "measurements": "1 inch",
          "notes": "Match jacket sleeve length"
        },
        {
          "taskName": "Take in Sides",
          "taskType": "alteration",
          "measurements": "0.5 inch on each side",
          "notes": "Slimmer fit to match suit"
        }
      ]
    }
  ]
}
```

### Rush Order Example

#### Job Creation
```json
{
  "customerId": 456,
  "orderStatus": "ALTERATION_ONLY",
  "dueDate": "2024-12-03",
  "rushOrder": true,
  "notes": "Rush order - business meeting tomorrow",
  "jobParts": [
    {
      "partName": "Charcoal Suit Pants",
      "partType": "PANTS",
      "priority": "RUSH",
      "estimatedTime": 45,
      "notes": "Rush hem for business meeting",
      "tasks": [
        {
          "taskName": "Hem",
          "taskType": "alteration",
          "measurements": "30 inch inseam",
          "notes": "Rush order - customer needs for tomorrow"
        }
      ]
    }
  ]
}
```

### Complex Alteration Example

#### Job Creation
```json
{
  "customerId": 789,
  "orderStatus": "ALTERATION_ONLY",
  "dueDate": "2024-12-10",
  "rushOrder": false,
  "notes": "Vintage suit restoration and alterations",
  "jobParts": [
    {
      "partName": "Vintage Wool Jacket",
      "partType": "JACKET",
      "priority": "NORMAL",
      "estimatedTime": 180,
      "notes": "Vintage jacket restoration",
      "tasks": [
        {
          "taskName": "Initial Assessment",
          "taskType": "measurement",
          "measurements": "",
          "notes": "Assess current condition and needed repairs"
        },
        {
          "taskName": "Repair Lining",
          "taskType": "custom",
          "measurements": "",
          "notes": "Repair torn lining in jacket"
        },
        {
          "taskName": "Shorten Sleeves",
          "taskType": "alteration",
          "measurements": "2 inches",
          "notes": "Shorten sleeves to modern length"
        },
        {
          "taskName": "Replace Buttons",
          "taskType": "button_work",
          "measurements": "",
          "notes": "Replace missing buttons with period-appropriate style"
        }
      ]
    }
  ]
}
```

## Conclusion

The Alterations Job Creation system provides a robust foundation for managing complex alteration workflows. It supports everything from simple hem jobs to complex multi-garment wedding alterations, with comprehensive tracking, validation, and integration capabilities.

Key benefits include:
- **Flexible Structure**: Support for any number of garments and tasks
- **Comprehensive Tracking**: Complete audit trail from creation to completion
- **Quality Assurance**: Built-in validation and business rules
- **Integration Ready**: Seamless integration with other business systems
- **Scalable Design**: Handles growing business needs efficiently

The system is designed to grow with your business, supporting both current operational needs and future enhancement requirements. 
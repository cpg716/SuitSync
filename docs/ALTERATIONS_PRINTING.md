# Alterations Printing System Documentation

## Overview

The Alterations Printing System provides comprehensive printing capabilities for alteration jobs, supporting multiple printer types and formats. It generates both individual garment tickets and complete job summaries, with proper formatting for thermal printers, receipt printers, and label printers.

## Table of Contents

1. [Print System Architecture](#print-system-architecture)
2. [Supported Printer Types](#supported-printer-types)
3. [Print Formats](#print-formats)
4. [API Endpoints](#api-endpoints)
5. [Print Templates](#print-templates)
6. [Frontend Integration](#frontend-integration)
7. [Printer Configuration](#printer-configuration)
8. [Testing and Validation](#testing-and-validation)
9. [Best Practices](#best-practices)
10. [Examples](#examples)

## Print System Architecture

### Core Components

#### Print Controller
- **Location**: `backend/src/controllers/printController.ts`
- **Purpose**: Handle all printing requests and format data
- **Functions**: Format data for different printer types
- **Integration**: Works with alteration job data

#### Print Service
- **Location**: `backend/src/services/printService.ts`
- **Purpose**: Business logic for print operations
- **Features**: Template rendering, data formatting
- **Output**: Formatted text for different printer types

#### Frontend Components
- **Location**: `frontend/components/ui/GarmentAlterationTag.tsx`
- **Purpose**: Visual preview and print interface
- **Features**: Print preview, format selection
- **Integration**: Browser print functionality

### Data Flow

```
Alteration Job Data
        ↓
   Print Controller
        ↓
   Format Functions
        ↓
   Printer-Specific Output
        ↓
   Print Device
```

## Supported Printer Types

### 1. Thermal Receipt Printers (ESC/POS)

#### Characteristics
- **Paper Width**: 80mm (3.15 inches)
- **Print Method**: Thermal printing
- **Commands**: ESC/POS command set
- **Use Case**: Individual garment tickets

#### Features
- **Auto-cut**: Automatic paper cutting after each ticket
- **Compact Format**: Optimized for small paper size
- **Barcode Support**: QR code integration
- **Text Formatting**: Bold, underline, alignment

### 2. Thermal Label Printers (ZPL)

#### Characteristics
- **Label Size**: Various sizes (2x1, 3x2, 4x2 inches)
- **Print Method**: Thermal transfer
- **Commands**: ZPL (Zebra Programming Language)
- **Use Case**: Garment labels and tags

#### Features
- **Label Design**: Custom label layouts
- **QR Codes**: High-quality QR code generation
- **Graphics**: Logo and image support
- **Variable Data**: Dynamic content printing

### 3. HTML/CSS Print (Browser)

#### Characteristics
- **Output**: PDF or direct printing
- **Format**: Web page layout
- **Commands**: HTML/CSS styling
- **Use Case**: Complete job summaries, reports

#### Features
- **Rich Formatting**: Full styling capabilities
- **Multi-page**: Support for long documents
- **Preview**: Visual preview before printing
- **Cross-platform**: Works on any device

## Print Formats

### 1. Individual Garment Tickets

#### Purpose
- **Work Tracking**: Individual tickets for each garment part
- **QR Code Scanning**: Easy status updates
- **Tailor Assignment**: Clear work assignment
- **Progress Tracking**: Visual status indicators

#### Content Structure
```
┌─────────────────────────────────────┐
│ CUSTOMER: John Smith                │
│ PARTY: Smith Wedding                │
│ JOB: ALT-2024-001                   │
│ DUE: Dec 8, 2024                    │
├─────────────────────────────────────┤
│ PART: Navy Suit Jacket              │
│ ASSIGNED: Mike Johnson              │
│ STATUS: IN PROGRESS                 │
├─────────────────────────────────────┤
│ TASKS:                              │
│ • Shorten Sleeves (1.5 inches)      │
│ • Button Replacement                │
│ • Initial Measurements              │
├─────────────────────────────────────┤
│ QR: [QR Code]                       │
│ Scan to update status               │
└─────────────────────────────────────┘
```

#### Format Specifications
- **Width**: 80mm (thermal) or variable (HTML)
- **Height**: Variable based on content
- **Font**: Monospace for thermal, system fonts for HTML
- **Alignment**: Left-aligned text
- **Spacing**: Compact for thermal, readable for HTML

### 2. Complete Job Summary

#### Purpose
- **Job Overview**: Complete job information
- **Customer Reference**: All details in one place
- **Quality Control**: Complete task list
- **Archival**: Permanent record of job

#### Content Structure
```
┌─────────────────────────────────────┐
│           SUITSYNC                  │
│      ALTERATION JOB SUMMARY         │
├─────────────────────────────────────┤
│ CUSTOMER INFORMATION:               │
│ Name: John Smith                    │
│ Phone: 555-123-4567                │
│ Party: Smith Wedding                │
│ Role: Groom                         │
│ Due Date: December 8, 2024          │
│ Staff Member: Sarah Johnson         │
├─────────────────────────────────────┤
│ ALL ALTERATIONS NEEDED:             │
│ ALTERATIONS:                        │
│ • Shorten Sleeves (Navy Suit Jacket)│
│ • Hem (Navy Suit Pants)             │
│ BUTTON WORK:                        │
│ • Button Replacement (Navy Suit Jacket)│
│ • Hook & Eye (Navy Suit Pants)      │
│ MEASUREMENTS:                       │
│ • Initial Measurements (Navy Suit Jacket)│
├─────────────────────────────────────┤
│ INDIVIDUAL GARMENT SECTIONS:        │
│ [Individual tickets follow]         │
└─────────────────────────────────────┘
```

#### Format Specifications
- **Width**: Full page width
- **Height**: Variable based on job complexity
- **Font**: Professional, readable fonts
- **Layout**: Structured sections with clear headers
- **Spacing**: Generous spacing for readability

## API Endpoints

### Generate Alterations Ticket

#### Endpoint
```http
GET /api/alterations/jobs/:jobId/ticket
```

#### Query Parameters
- `format`: `receipt`, `zpl`, `html` (default: `html`)
- `type`: `individual`, `complete` (default: `complete`)
- `partId`: Specific part ID for individual tickets

#### Response Types

##### HTML Format
```http
Content-Type: text/html
```
```html
<!DOCTYPE html>
<html>
<head>
    <title>Alteration Job - ALT-2024-001</title>
    <style>
        /* Print-optimized CSS */
        @media print {
            body { margin: 0; }
            .ticket { page-break-after: always; }
        }
    </style>
</head>
<body>
    <!-- Formatted ticket content -->
</body>
</html>
```

##### Receipt Format (ESC/POS)
```http
Content-Type: text/plain
```
```
CUSTOMER: John Smith
PARTY: Smith Wedding
JOB: ALT-2024-001
DUE: Dec 8, 2024
─────────────────────────
PART: Navy Suit Jacket
ASSIGNED: Mike Johnson
STATUS: IN PROGRESS
─────────────────────────
TASKS:
• Shorten Sleeves (1.5 inches)
• Button Replacement
• Initial Measurements
─────────────────────────
QR: [QR Code Data]
Scan to update status
```

##### ZPL Format
```http
Content-Type: text/plain
```
```
^XA
^FO50,50^A0N,50,50^FDAlteration Job^FS
^FO50,100^A0N,30,30^FDALT-2024-001^FS
^FO50,150^A0N,25,25^FDJohn Smith^FS
^FO50,200^A0N,25,25^FDNavy Suit Jacket^FS
^FO50,250^A0N,20,20^FDShorten Sleeves^FS
^FO50,300^A0N,20,20^FD1.5 inches^FS
^XZ
```

### Print Preview

#### Endpoint
```http
GET /api/alterations/jobs/:jobId/print-preview
```

#### Response
```json
{
  "success": true,
  "preview": {
    "html": "<html>...</html>",
    "receipt": "CUSTOMER: John Smith...",
    "zpl": "^XA^FO50,50..."
  },
  "jobInfo": {
    "jobNumber": "ALT-2024-001",
    "customerName": "John Smith",
    "partCount": 2,
    "totalTasks": 5
  }
}
```

## Print Templates

### 1. Receipt Template (ESC/POS)

#### Template Structure
```typescript
interface ReceiptTemplate {
  header: {
    customer: string;
    party: string;
    jobNumber: string;
    dueDate: string;
  };
  part: {
    name: string;
    assignedTo: string;
    status: string;
  };
  tasks: {
    name: string;
    type: string;
    measurements?: string;
  }[];
  footer: {
    qrCode: string;
    instructions: string;
  };
}
```

#### Formatting Functions
```typescript
function formatReceiptTicket(job: AlterationJob, part: AlterationJobPart): string {
  return `
${job.customer?.name || 'Unknown Customer'}
${job.party?.name || ''}
JOB: ${job.jobNumber}
DUE: ${formatDate(job.dueDate)}
${'─'.repeat(40)}
PART: ${part.partName}
ASSIGNED: ${part.assignedUser?.name || 'Unassigned'}
STATUS: ${part.status}
${'─'.repeat(40)}
TASKS:
${part.tasks.map(task => `• ${task.taskName}${task.measurements ? ` (${task.measurements})` : ''}`).join('\n')}
${'─'.repeat(40)}
QR: ${part.qrCode}
Scan to update status
`;
}
```

### 2. Complete Job Template

#### Template Structure
```typescript
interface CompleteJobTemplate {
  header: {
    title: string;
    jobNumber: string;
  };
  customerInfo: {
    name: string;
    phone: string;
    party: string;
    role: string;
    dueDate: string;
    staffMember: string;
  };
  alterationsSummary: {
    alterations: string[];
    buttonWork: string[];
    measurements: string[];
    custom: string[];
  };
  individualTickets: ReceiptTemplate[];
}
```

#### Formatting Functions
```typescript
function formatCompleteJob(job: AlterationJob): string {
  const summary = summarizeAllTasks(job);
  
  return `
           SUITSYNC
      ALTERATION JOB SUMMARY
${'─'.repeat(40)}
CUSTOMER INFORMATION:
Name: ${job.customer?.name}
Phone: ${job.customer?.phone}
Party: ${job.party?.name || 'N/A'}
Role: ${job.partyMember?.role || 'N/A'}
Due Date: ${formatDate(job.dueDate)}
Staff Member: ${job.tailor?.name || 'Unassigned'}
${'─'.repeat(40)}
ALL ALTERATIONS NEEDED:
${formatTaskSummary(summary)}
${'─'.repeat(40)}
INDIVIDUAL GARMENT SECTIONS:
${job.jobParts.map(part => formatReceiptTicket(job, part)).join('\n\n')}
`;
}
```

### 3. ZPL Template

#### Template Structure
```typescript
interface ZPLTemplate {
  labelSize: string;
  content: {
    title: string;
    jobNumber: string;
    customerName: string;
    partName: string;
    tasks: string[];
    qrCode: string;
  };
}
```

#### Formatting Functions
```typescript
function formatZPLTicket(job: AlterationJob, part: AlterationJobPart): string {
  return `^XA
^FO50,50^A0N,50,50^FDAlteration Job^FS
^FO50,100^A0N,30,30^FD${job.jobNumber}^FS
^FO50,150^A0N,25,25^FD${job.customer?.name}^FS
^FO50,200^A0N,25,25^FD${part.partName}^FS
${part.tasks.map((task, index) => 
  `^FO50,${250 + index * 30}^A0N,20,20^FD${task.taskName}^FS`
).join('\n')}
^FO50,400^BY3^BCN,100,Y,N,N^FD${part.qrCode}^FS
^XZ`;
}
```

## Frontend Integration

### Print Components

#### GarmentAlterationTag Component
```typescript
interface GarmentAlterationTagProps {
  job: AlterationJob;
  part: AlterationJobPart;
  format: 'html' | 'receipt' | 'zpl';
  showPreview?: boolean;
  onPrint?: () => void;
}
```

#### Print Preview Modal
```typescript
interface PrintPreviewModalProps {
  open: boolean;
  onClose: () => void;
  job: AlterationJob;
  format: 'html' | 'receipt' | 'zpl';
  onPrint: () => void;
}
```

### Print Functions

#### Browser Print
```typescript
function printToBrowser(content: string): void {
  const printWindow = window.open('', '_blank');
  printWindow?.document.write(content);
  printWindow?.document.close();
  printWindow?.print();
}
```

#### Download PDF
```typescript
async function downloadPDF(content: string, filename: string): Promise<void> {
  const response = await fetch('/api/print/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, filename })
  });
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
```

## Printer Configuration

### 1. Thermal Receipt Printer Setup

#### Hardware Configuration
- **Connection**: USB, Network, or Serial
- **Paper Width**: 80mm thermal paper
- **Print Speed**: 250mm/s
- **Resolution**: 203 DPI

#### Software Configuration
```typescript
interface ReceiptPrinterConfig {
  type: 'receipt';
  connection: 'usb' | 'network' | 'serial';
  address?: string;
  port?: number;
  baudRate?: number;
  paperWidth: 80;
  autoCut: true;
  encoding: 'utf8';
}
```

### 2. Thermal Label Printer Setup

#### Hardware Configuration
- **Connection**: USB or Network
- **Label Size**: 2x1, 3x2, or 4x2 inches
- **Print Speed**: 6 inches/second
- **Resolution**: 203 DPI

#### Software Configuration
```typescript
interface LabelPrinterConfig {
  type: 'zpl';
  connection: 'usb' | 'network';
  address?: string;
  labelSize: '2x1' | '3x2' | '4x2';
  printSpeed: 6;
  resolution: 203;
}
```

### 3. Browser Print Configuration

#### Print Settings
```typescript
interface BrowserPrintConfig {
  type: 'browser';
  paperSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  scale: number;
}
```

## Testing and Validation

### Test Scripts

#### Print Format Testing
```bash
node test-print-enhanced-tasks.js
```

This script tests:
- Individual garment ticket formatting
- Complete job summary formatting
- Different printer format outputs
- QR code generation
- Data validation

#### Print Output Validation
```typescript
function validatePrintOutput(output: string, format: string): boolean {
  switch (format) {
    case 'receipt':
      return validateReceiptFormat(output);
    case 'zpl':
      return validateZPLFormat(output);
    case 'html':
      return validateHTMLFormat(output);
    default:
      return false;
  }
}
```

### Print Quality Checks

#### Content Validation
- **Required Fields**: All required information present
- **Formatting**: Proper alignment and spacing
- **QR Codes**: Valid QR code data
- **Character Encoding**: Proper character display

#### Layout Validation
- **Page Breaks**: Proper page breaks for multi-page jobs
- **Margins**: Adequate margins for printer
- **Font Sizes**: Readable font sizes
- **Spacing**: Appropriate line spacing

## Best Practices

### Print Design Guidelines

#### Receipt Format
- **Compact Layout**: Maximize information in small space
- **Clear Hierarchy**: Use spacing and alignment for readability
- **Essential Information**: Focus on key details
- **QR Code Placement**: Prominent QR code location

#### Complete Job Format
- **Professional Layout**: Clean, organized appearance
- **Section Headers**: Clear section divisions
- **Comprehensive Information**: Include all relevant details
- **Readable Typography**: Use appropriate fonts and sizes

### Content Organization

#### Information Priority
1. **Customer Information**: Name, contact, party
2. **Job Details**: Job number, due date, status
3. **Work Information**: Tasks, measurements, notes
4. **Technical Details**: QR codes, tracking information

#### Visual Hierarchy
- **Headers**: Bold, larger text for sections
- **Subheaders**: Medium text for subsections
- **Body Text**: Regular text for details
- **Notes**: Smaller text for additional information

### Printer Optimization

#### Thermal Printers
- **Character Limits**: Respect printer character limits
- **Line Breaks**: Proper line break handling
- **Cut Commands**: Automatic cut after each ticket
- **Encoding**: Proper character encoding

#### Label Printers
- **Label Size**: Optimize for label dimensions
- **QR Code Size**: Appropriate QR code dimensions
- **Text Scaling**: Proper text scaling for readability
- **Graphics**: Optimize graphics for thermal printing

## Examples

### Wedding Suit Alteration Job

#### Individual Ticket (Receipt Format)
```
CUSTOMER: John Smith
PARTY: Smith Wedding
JOB: ALT-2024-001
DUE: Dec 8, 2024
─────────────────────────
PART: Navy Suit Jacket
ASSIGNED: Mike Johnson
STATUS: IN PROGRESS
─────────────────────────
TASKS:
• Shorten Sleeves (1.5 inches)
• Button Replacement
• Initial Measurements
─────────────────────────
QR: QR-PART-1703123456789-abc123def
Scan to update status
```

#### Complete Job Summary (HTML Format)
```html
<!DOCTYPE html>
<html>
<head>
    <title>Alteration Job - ALT-2024-001</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; font-size: 24px; font-weight: bold; }
        .section { margin: 20px 0; border: 1px solid #ccc; padding: 15px; }
        .section h3 { margin-top: 0; color: #333; }
        .task-list { list-style: none; padding: 0; }
        .task-list li { padding: 5px 0; border-bottom: 1px solid #eee; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">SUITSYNC - ALTERATION JOB SUMMARY</div>
    
    <div class="section">
        <h3>CUSTOMER INFORMATION</h3>
        <p><strong>Name:</strong> John Smith</p>
        <p><strong>Phone:</strong> 555-123-4567</p>
        <p><strong>Party:</strong> Smith Wedding</p>
        <p><strong>Role:</strong> Groom</p>
        <p><strong>Due Date:</strong> December 8, 2024</p>
        <p><strong>Staff Member:</strong> Sarah Johnson</p>
    </div>
    
    <div class="section">
        <h3>ALL ALTERATIONS NEEDED</h3>
        <h4>ALTERATIONS:</h4>
        <ul class="task-list">
            <li>• Shorten Sleeves (Navy Suit Jacket)</li>
            <li>• Hem (Navy Suit Pants)</li>
        </ul>
        <h4>BUTTON WORK:</h4>
        <ul class="task-list">
            <li>• Button Replacement (Navy Suit Jacket)</li>
            <li>• Hook & Eye (Navy Suit Pants)</li>
        </ul>
    </div>
</body>
</html>
```

### Rush Order Example

#### Individual Ticket (Receipt Format)
```
CUSTOMER: Jane Doe
JOB: ALT-2024-002
DUE: Dec 3, 2024 (RUSH)
─────────────────────────
PART: Charcoal Suit Pants
ASSIGNED: Lisa Chen
STATUS: IN PROGRESS
─────────────────────────
TASKS:
• Hem (30 inch inseam)
─────────────────────────
QR: QR-PART-1703123456790-def456ghi
Scan to update status
```

### Complex Job Example

#### ZPL Label Format
```
^XA
^FO50,50^A0N,50,50^FDAlteration Job^FS
^FO50,100^A0N,30,30^FDALT-2024-003^FS
^FO50,150^A0N,25,25^FDVintage Wool Jacket^FS
^FO50,200^A0N,20,20^FDShorten Sleeves^FS
^FO50,230^A0N,20,20^FD2 inches^FS
^FO50,260^A0N,20,20^FDButton Replacement^FS
^FO50,320^BY3^BCN,100,Y,N,N^FDQR-PART-1703123456791-ghi789jkl^FS
^XZ
```

## Conclusion

The Alterations Printing System provides comprehensive printing capabilities for all aspects of alteration job management. It supports multiple printer types, formats, and use cases, ensuring that the right information is available in the right format for every situation.

Key benefits include:
- **Multiple Formats**: Support for receipt, label, and document printing
- **Flexible Layouts**: Customizable templates for different needs
- **Quality Output**: Professional, readable print formats
- **Integration Ready**: Seamless integration with existing workflows
- **Scalable Design**: Handles growing business needs efficiently

The system is designed to provide clear, professional output that supports efficient workflow management and quality control processes. 
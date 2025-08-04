# QR Codes System Documentation

## Overview

The QR Codes System provides comprehensive tracking and management capabilities for alteration jobs through unique QR code generation, scanning, and status updates. It enables efficient workflow management by allowing tailors to quickly update job status and track progress through mobile scanning.

## Table of Contents

1. [QR Code System Architecture](#qr-code-system-architecture)
2. [QR Code Generation](#qr-code-generation)
3. [QR Code Scanning](#qr-code-scanning)
4. [Status Updates](#status-updates)
5. [API Endpoints](#api-endpoints)
6. [Frontend Integration](#frontend-integration)
7. [Mobile Integration](#mobile-integration)
8. [Security and Validation](#security-and-validation)
9. [Testing and Validation](#testing-and-validation)
10. [Best Practices](#best-practices)
11. [Examples](#examples)

## QR Code System Architecture

### Core Components

#### QR Code Generator
- **Location**: `backend/src/services/qrCodeService.ts`
- **Purpose**: Generate unique QR codes for job parts
- **Features**: Unique identifier generation, format validation
- **Output**: QR code data and image generation

#### QR Code Scanner
- **Location**: `backend/src/controllers/alterationsController.ts`
- **Purpose**: Process scanned QR codes and update status
- **Features**: Code validation, status updates, audit logging
- **Integration**: Works with alteration job workflow

#### Frontend Components
- **Location**: `frontend/components/ui/QRCodeDisplay.tsx`
- **Purpose**: Display QR codes and handle scanning
- **Features**: QR code rendering, scan interface
- **Integration**: Browser camera and mobile apps

### Data Flow

```
Job Part Creation
        ↓
   QR Code Generation
        ↓
   Unique Identifier
        ↓
   QR Code Display
        ↓
   Mobile Scanning
        ↓
   Status Update
        ↓
   Database Update
```

## QR Code Generation

### Generation Process

#### 1. Unique Identifier Creation
```typescript
function generateQRCode(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `QR-PART-${timestamp}-${random}`;
}
```

#### 2. QR Code Format
- **Prefix**: `QR-PART-` (identifies alteration part QR codes)
- **Timestamp**: Unix timestamp for uniqueness
- **Random String**: 9-character random string
- **Example**: `QR-PART-1703123456789-abc123def`

#### 3. QR Code Content
```typescript
interface QRCodeContent {
  qrCode: string;           // Unique identifier
  partId: number;           // Database part ID
  jobId: number;            // Database job ID
  partName: string;         // Human-readable part name
  jobNumber: string;        // Job number for reference
  customerName: string;     // Customer name for verification
}
```

### QR Code Properties

#### Physical Properties
- **Size**: 2x2 inches (minimum for easy scanning)
- **Error Correction**: Level M (15% recovery)
- **Format**: QR Code 2005 standard
- **Encoding**: UTF-8 for international character support

#### Content Properties
- **Data Capacity**: Up to 2,953 bytes
- **Character Set**: Alphanumeric and special characters
- **Compression**: None (raw data for reliability)
- **Validation**: Checksum for data integrity

### Generation Examples

#### Basic QR Code
```typescript
const qrCode = generateQRCode();
// Output: QR-PART-1703123456789-abc123def
```

#### QR Code with Metadata
```typescript
const qrCodeData = {
  qrCode: "QR-PART-1703123456789-abc123def",
  partId: 456,
  jobId: 123,
  partName: "Navy Suit Jacket",
  jobNumber: "ALT-2024-001",
  customerName: "John Smith"
};
```

## QR Code Scanning

### Scanning Process

#### 1. Code Detection
- **Camera Input**: Mobile camera or webcam
- **Code Recognition**: QR code detection and decoding
- **Data Extraction**: Parse QR code content
- **Validation**: Verify code format and content

#### 2. Status Update Workflow
```typescript
async function processQRCodeScan(qrCode: string, userId: number): Promise<ScanResult> {
  // 1. Validate QR code format
  if (!isValidQRCode(qrCode)) {
    throw new Error('Invalid QR code format');
  }

  // 2. Find associated job part
  const part = await findPartByQRCode(qrCode);
  if (!part) {
    throw new Error('QR code not found in system');
  }

  // 3. Determine current status
  const currentStatus = part.status;

  // 4. Update status based on current state
  const newStatus = determineNextStatus(currentStatus);

  // 5. Update database
  await updatePartStatus(part.id, newStatus, userId);

  // 6. Log scan activity
  await logQRScan(qrCode, userId, currentStatus, newStatus);

  return {
    success: true,
    part,
    oldStatus: currentStatus,
    newStatus,
    message: `Status updated from ${currentStatus} to ${newStatus}`
  };
}
```

#### 3. Status Progression
```
NOT_STARTED → IN_PROGRESS → COMPLETE → PICKED_UP
```

### Scanning Interfaces

#### Mobile App Scanning
- **Camera Access**: Direct camera integration
- **Real-time Detection**: Live QR code detection
- **Vibration Feedback**: Haptic feedback on successful scan
- **Audio Feedback**: Beep sound for scan confirmation

#### Web Browser Scanning
- **Webcam Access**: Browser camera integration
- **File Upload**: Upload QR code images
- **Manual Entry**: Type QR code manually
- **Cross-platform**: Works on desktop and mobile browsers

#### Standalone Scanner
- **Hardware Scanner**: USB or Bluetooth scanner
- **Keyboard Emulation**: Acts as keyboard input
- **Batch Processing**: Multiple codes at once
- **Offline Mode**: Works without internet connection

## Status Updates

### Status Management

#### Current Status Detection
```typescript
function getCurrentStatus(part: AlterationJobPart): AlterationJobStatus {
  // Check if any tasks are in progress
  const hasInProgressTasks = part.tasks.some(task => task.status === 'IN_PROGRESS');
  
  // Check if all tasks are complete
  const allTasksComplete = part.tasks.every(task => task.status === 'COMPLETE');
  
  if (allTasksComplete) return 'COMPLETE';
  if (hasInProgressTasks) return 'IN_PROGRESS';
  return 'NOT_STARTED';
}
```

#### Status Transition Logic
```typescript
function determineNextStatus(currentStatus: AlterationJobStatus): AlterationJobStatus {
  switch (currentStatus) {
    case 'NOT_STARTED':
      return 'IN_PROGRESS';
    case 'IN_PROGRESS':
      return 'COMPLETE';
    case 'COMPLETE':
      return 'PICKED_UP';
    case 'PICKED_UP':
      return 'PICKED_UP'; // No further progression
    default:
      return currentStatus;
  }
}
```

### Update Triggers

#### Automatic Updates
- **Task Completion**: When all tasks in a part are complete
- **Job Completion**: When all parts in a job are complete
- **Pickup Confirmation**: When customer picks up completed job

#### Manual Updates
- **Tailor Actions**: Tailor manually updates status
- **Manager Override**: Manager forces status change
- **System Admin**: Administrative status changes

### Audit Trail

#### Scan Logging
```typescript
interface QRScanLog {
  id: number;
  qrCode: string;
  userId: number;
  partId: number;
  jobId: number;
  oldStatus: AlterationJobStatus;
  newStatus: AlterationJobStatus;
  timestamp: Date;
  deviceInfo?: string;
  location?: string;
  notes?: string;
}
```

#### Log Entry Example
```typescript
await prisma.qRScanLog.create({
  data: {
    qrCode: "QR-PART-1703123456789-abc123def",
    userId: 5,
    partId: 456,
    jobId: 123,
    oldStatus: "NOT_STARTED",
    newStatus: "IN_PROGRESS",
    timestamp: new Date(),
    deviceInfo: "iPhone 15 Pro",
    location: "Tailor Station 1",
    notes: "Started work on jacket"
  }
});
```

## API Endpoints

### Scan QR Code

#### Endpoint
```http
POST /api/alterations/scan/:qrCode
```

#### Request Body
```json
{
  "userId": 5,
  "notes": "Started work on jacket",
  "deviceInfo": "iPhone 15 Pro",
  "location": "Tailor Station 1"
}
```

#### Response
```json
{
  "success": true,
  "scanResult": {
    "qrCode": "QR-PART-1703123456789-abc123def",
    "part": {
      "id": 456,
      "partName": "Navy Suit Jacket",
      "status": "IN_PROGRESS"
    },
    "job": {
      "id": 123,
      "jobNumber": "ALT-2024-001",
      "customerName": "John Smith"
    },
    "oldStatus": "NOT_STARTED",
    "newStatus": "IN_PROGRESS",
    "message": "Work started on Navy Suit Jacket"
  }
}
```

### Get QR Code Information

#### Endpoint
```http
GET /api/alterations/qr/:qrCode
```

#### Response
```json
{
  "success": true,
  "qrCode": "QR-PART-1703123456789-abc123def",
  "part": {
    "id": 456,
    "partName": "Navy Suit Jacket",
    "status": "IN_PROGRESS",
    "assignedUser": {
      "id": 5,
      "name": "Mike Johnson"
    },
    "tasks": [
      {
        "id": 789,
        "taskName": "Shorten Sleeves",
        "status": "IN_PROGRESS"
      }
    ]
  },
  "job": {
    "id": 123,
    "jobNumber": "ALT-2024-001",
    "customerName": "John Smith",
    "dueDate": "2024-12-08"
  }
}
```

### Get Scan History

#### Endpoint
```http
GET /api/alterations/scan-logs?qrCode=QR-PART-1703123456789-abc123def
```

#### Response
```json
{
  "success": true,
  "scanLogs": [
    {
      "id": 1,
      "qrCode": "QR-PART-1703123456789-abc123def",
      "userId": 5,
      "userName": "Mike Johnson",
      "oldStatus": "NOT_STARTED",
      "newStatus": "IN_PROGRESS",
      "timestamp": "2024-12-01T09:00:00.000Z",
      "deviceInfo": "iPhone 15 Pro",
      "location": "Tailor Station 1",
      "notes": "Started work on jacket"
    },
    {
      "id": 2,
      "qrCode": "QR-PART-1703123456789-abc123def",
      "userId": 5,
      "userName": "Mike Johnson",
      "oldStatus": "IN_PROGRESS",
      "newStatus": "COMPLETE",
      "timestamp": "2024-12-01T10:30:00.000Z",
      "deviceInfo": "iPhone 15 Pro",
      "location": "Tailor Station 1",
      "notes": "Completed all tasks"
    }
  ]
}
```

## Frontend Integration

### QR Code Display Components

#### QRCodeDisplay Component
```typescript
interface QRCodeDisplayProps {
  qrCode: string;
  partName: string;
  jobNumber: string;
  customerName: string;
  size?: number;
  showInfo?: boolean;
  onScan?: () => void;
}
```

#### QR Code Generation
```typescript
import QRCode from 'qrcode';

async function generateQRCodeImage(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}
```

#### QR Code Scanner Component
```typescript
interface QRCodeScannerProps {
  onScan: (result: string) => void;
  onError: (error: string) => void;
  onClose: () => void;
  showScanner: boolean;
}
```

### Scanner Implementation

#### Webcam Scanner
```typescript
import { QrReader } from 'react-qr-reader';

function QRCodeScanner({ onScan, onError, onClose, showScanner }: QRCodeScannerProps) {
  const handleScan = (result: any) => {
    if (result) {
      onScan(result.text);
    }
  };

  const handleError = (error: any) => {
    onError(error.message);
  };

  if (!showScanner) return null;

  return (
    <div className="qr-scanner-modal">
      <QrReader
        onResult={handleScan}
        constraints={{ facingMode: 'environment' }}
        className="qr-scanner"
      />
      <button onClick={onClose}>Close Scanner</button>
    </div>
  );
}
```

#### File Upload Scanner
```typescript
function QRCodeFileScanner({ onScan, onError }: QRCodeScannerProps) {
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await QRCode.decode(file);
      onScan(result.data);
    } catch (error) {
      onError('Failed to decode QR code from image');
    }
  };

  return (
    <div className="qr-file-scanner">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="qr-file-input"
      />
      <p>Upload QR code image to scan</p>
    </div>
  );
}
```

## Mobile Integration

### Mobile App Features

#### Camera Integration
- **Native Camera**: Direct access to device camera
- **Auto-focus**: Automatic focus on QR codes
- **Flash Control**: Toggle flash for low-light scanning
- **Orientation Support**: Works in portrait and landscape

#### Offline Capability
- **Local Storage**: Cache scanned codes for offline processing
- **Sync Queue**: Queue updates for when connection is restored
- **Conflict Resolution**: Handle conflicts when reconnecting

#### Push Notifications
- **Status Updates**: Notify when job status changes
- **Due Date Alerts**: Remind about approaching deadlines
- **Assignment Notifications**: Alert when assigned new work

### Mobile API Integration

#### Scan and Update
```typescript
async function scanAndUpdate(qrCode: string, userId: number): Promise<ScanResult> {
  try {
    const response = await fetch('/api/alterations/scan/' + qrCode, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        userId,
        deviceInfo: getDeviceInfo(),
        location: getCurrentLocation(),
        notes: 'Mobile scan'
      })
    });

    const result = await response.json();
    
    if (result.success) {
      // Show success notification
      showNotification('Status updated successfully', 'success');
      return result.scanResult;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    // Show error notification
    showNotification('Failed to update status', 'error');
    throw error;
  }
}
```

#### Batch Scanning
```typescript
async function batchScan(qrCodes: string[], userId: number): Promise<BatchScanResult> {
  const results = [];
  
  for (const qrCode of qrCodes) {
    try {
      const result = await scanAndUpdate(qrCode, userId);
      results.push({ qrCode, success: true, result });
    } catch (error) {
      results.push({ qrCode, success: false, error: error.message });
    }
  }
  
  return {
    total: qrCodes.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };
}
```

## Security and Validation

### QR Code Validation

#### Format Validation
```typescript
function isValidQRCode(qrCode: string): boolean {
  // Check format: QR-PART-timestamp-random
  const pattern = /^QR-PART-\d{13}-[a-z0-9]{9}$/;
  return pattern.test(qrCode);
}
```

#### Content Validation
```typescript
function validateQRCodeContent(content: QRCodeContent): boolean {
  return (
    content.qrCode &&
    content.partId &&
    content.jobId &&
    content.partName &&
    content.jobNumber &&
    content.customerName
  );
}
```

### Access Control

#### User Permissions
- **Tailor Access**: Can scan and update assigned jobs
- **Manager Access**: Can scan and update any job
- **Admin Access**: Full access to all QR code operations
- **Read-only Access**: Can view but not update

#### Session Validation
```typescript
function validateScanSession(req: Request): boolean {
  const user = req.user;
  const qrCode = req.params.qrCode;
  
  // Check if user is authenticated
  if (!user) return false;
  
  // Check if user has scan permissions
  if (!hasPermission(user, 'alterations', 'write')) return false;
  
  // Check if QR code belongs to user's assigned jobs
  const part = await findPartByQRCode(qrCode);
  if (!part) return false;
  
  if (part.assignedTo && part.assignedTo !== user.id) {
    // Check if user is manager or admin
    if (!hasPermission(user, 'alterations', 'admin')) return false;
  }
  
  return true;
}
```

### Data Integrity

#### Checksum Validation
```typescript
function generateChecksum(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex').substr(0, 8);
}

function validateChecksum(data: string, checksum: string): boolean {
  const expectedChecksum = generateChecksum(data);
  return checksum === expectedChecksum;
}
```

#### Duplicate Prevention
```typescript
function isDuplicateScan(qrCode: string, userId: number, timeWindow: number = 5000): boolean {
  const recentScans = getRecentScans(qrCode, userId, timeWindow);
  return recentScans.length > 0;
}
```

## Testing and Validation

### Test Scripts

#### QR Code Generation Testing
```bash
node test-qr-workflow.js
```

This script tests:
- QR code generation
- Format validation
- Content validation
- Duplicate prevention

#### Scanning Workflow Testing
```bash
node test-scan-workflow.js
```

This script tests:
- QR code scanning
- Status updates
- Audit logging
- Error handling

### Validation Functions

#### QR Code Format Testing
```typescript
function testQRCodeFormat() {
  const validCodes = [
    'QR-PART-1703123456789-abc123def',
    'QR-PART-1703123456790-def456ghi'
  ];
  
  const invalidCodes = [
    'QR-PART-123-abc',
    'QR-PART-1703123456789-abc',
    'QR-123-1703123456789-abc123def'
  ];
  
  validCodes.forEach(code => {
    assert(isValidQRCode(code), `Valid code failed: ${code}`);
  });
  
  invalidCodes.forEach(code => {
    assert(!isValidQRCode(code), `Invalid code passed: ${code}`);
  });
}
```

#### Scanning Workflow Testing
```typescript
async function testScanWorkflow() {
  // 1. Generate QR code
  const qrCode = generateQRCode();
  
  // 2. Create test job part
  const part = await createTestPart(qrCode);
  
  // 3. Test status progression
  const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE'];
  
  for (const expectedStatus of statuses) {
    const result = await scanQRCode(qrCode, testUserId);
    assert(result.newStatus === expectedStatus, 
      `Expected ${expectedStatus}, got ${result.newStatus}`);
  }
}
```

## Best Practices

### QR Code Design

#### Physical Design
- **Size**: Minimum 2x2 inches for easy scanning
- **Contrast**: High contrast (black on white)
- **Placement**: Accessible location on garment
- **Protection**: Laminated or protected from damage

#### Content Design
- **Unique Identifiers**: Ensure uniqueness across system
- **Error Correction**: Use appropriate error correction level
- **Data Validation**: Validate all data before encoding
- **Backup Information**: Include human-readable backup

### Scanning Workflow

#### User Experience
- **Clear Instructions**: Provide clear scanning instructions
- **Visual Feedback**: Show scan results immediately
- **Error Handling**: Graceful handling of scan errors
- **Offline Support**: Work without internet connection

#### Performance Optimization
- **Fast Scanning**: Optimize for quick scan recognition
- **Batch Processing**: Support multiple scans at once
- **Caching**: Cache frequently used data
- **Background Sync**: Sync data in background

### Security Considerations

#### Access Control
- **User Authentication**: Require authentication for scans
- **Permission Checking**: Verify user permissions
- **Session Management**: Proper session handling
- **Audit Logging**: Log all scan activities

#### Data Protection
- **Encryption**: Encrypt sensitive data in QR codes
- **Validation**: Validate all scanned data
- **Sanitization**: Sanitize input data
- **Rate Limiting**: Prevent abuse through rate limiting

## Examples

### Wedding Suit Job

#### QR Code Generation
```typescript
const qrCode = generateQRCode();
// Output: QR-PART-1703123456789-abc123def

const qrCodeData = {
  qrCode: "QR-PART-1703123456789-abc123def",
  partId: 456,
  jobId: 123,
  partName: "Navy Suit Jacket",
  jobNumber: "ALT-2024-001",
  customerName: "John Smith"
};
```

#### Scanning Workflow
```typescript
// 1. Initial scan - start work
const scan1 = await scanQRCode("QR-PART-1703123456789-abc123def", 5);
// Result: NOT_STARTED → IN_PROGRESS

// 2. Progress scan - complete work
const scan2 = await scanQRCode("QR-PART-1703123456789-abc123def", 5);
// Result: IN_PROGRESS → COMPLETE

// 3. Pickup scan - customer pickup
const scan3 = await scanQRCode("QR-PART-1703123456789-abc123def", 1);
// Result: COMPLETE → PICKED_UP
```

### Rush Order Example

#### QR Code for Rush Job
```typescript
const rushQRCode = "QR-PART-1703123456790-def456ghi";
const rushPart = {
  partName: "Charcoal Suit Pants",
  jobNumber: "ALT-2024-002",
  customerName: "Jane Doe",
  priority: "RUSH",
  dueDate: "2024-12-03"
};
```

#### Quick Status Update
```typescript
// Tailor scans to start rush job
const rushScan = await scanQRCode(rushQRCode, 5);
// Immediately notifies customer of status change
await sendNotification(rushPart.customerName, "Work started on your rush order");
```

### Complex Job Example

#### Multiple QR Codes
```typescript
const jobQRCodes = [
  "QR-PART-1703123456791-ghi789jkl", // Jacket
  "QR-PART-1703123456792-jkl012mno", // Pants
  "QR-PART-1703123456793-mno345pqr"  // Vest
];

// Scan all parts to start work
for (const qrCode of jobQRCodes) {
  await scanQRCode(qrCode, 5);
  await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
}
```

## Conclusion

The QR Codes System provides a robust foundation for efficient alteration job tracking and management. It enables seamless workflow integration through mobile scanning, real-time status updates, and comprehensive audit trails.

Key benefits include:
- **Efficient Workflow**: Quick status updates through scanning
- **Mobile Integration**: Works on any mobile device
- **Audit Trail**: Complete tracking of all activities
- **Flexible Design**: Supports various use cases and workflows
- **Scalable Architecture**: Handles growing business needs

The system is designed to streamline alteration operations while maintaining data integrity and providing comprehensive tracking capabilities for quality control and customer service. 
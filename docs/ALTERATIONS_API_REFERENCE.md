# Alterations API Reference

## Quick Reference Guide

### Base URL
```
http://localhost:3000/api/alterations
```

### Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Job Management

### Create Alteration Job
```http
POST /api/alterations
```

**Request Body:**
```json
{
  "customerId": 1,
  "partyId": 5,
  "orderStatus": "ALTERATION_ONLY",
  "dueDate": "2024-12-08",
  "rushOrder": false,
  "notes": "Wedding suit alterations",
  "jobParts": [
    {
      "partName": "Navy Suit Jacket",
      "partType": "JACKET",
      "priority": "HIGH",
      "estimatedTime": 120,
      "notes": "Wedding jacket",
      "tasks": [
        {
          "taskName": "Shorten Sleeves",
          "taskType": "alteration",
          "measurements": "1.5 inches"
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "alterationJob": {
    "id": 123,
    "jobNumber": "ALT-2024-001",
    "status": "NOT_STARTED"
  },
  "jobParts": [...],
  "message": "Alteration job created successfully"
}
```

### Get Alteration Job
```http
GET /api/alterations/jobs/:jobId
```

**Response:**
```json
{
  "id": 123,
  "jobNumber": "ALT-2024-001",
  "status": "IN_PROGRESS",
  "customer": {...},
  "party": {...},
  "jobParts": [
    {
      "id": 456,
      "partName": "Navy Suit Jacket",
      "status": "IN_PROGRESS",
      "assignedUser": {...},
      "tasks": [...]
    }
  ]
}
```

### Get Job History
```http
GET /api/alterations/jobs/:jobId/history
```

**Response:**
```json
{
  "success": true,
  "job": {
    "id": 123,
    "jobNumber": "ALT-2024-001",
    "status": "COMPLETE",
    "jobParts": [
      {
        "id": 456,
        "tasks": [
          {
            "id": 789,
            "taskName": "Shorten Sleeves",
            "status": "COMPLETE",
            "startTime": "2024-12-01T09:00:00Z",
            "finishTime": "2024-12-01T10:30:00Z",
            "timeSpent": 90,
            "initials": "MJ",
            "assignedUser": {...},
            "taskLogs": [...]
          }
        ],
        "assignmentLogs": [...]
      }
    ],
    "assignmentLogs": [...]
  }
}
```

## Tailor Assignment

### Get Available Tailors
```http
GET /api/alterations/available-tailors?taskType=alteration&estimatedTime=120&preferredDate=2024-12-01
```

**Query Parameters:**
- `taskType` (optional): Filter by task type (alteration, button_work, measurement, custom)
- `estimatedTime` (optional): Estimated time in minutes
- `preferredDate` (optional): Preferred date for assignment

**Response:**
```json
{
  "success": true,
  "tailors": [
    {
      "id": 5,
      "name": "Mike Johnson",
      "abilities": ["Alteration", "Button Work", "Measurement"],
      "availability": "Available"
    }
  ]
}
```

### Assign Tailor to Part
```http
POST /api/alterations/parts/:partId/assign
```

**Request Body:**
```json
{
  "tailorId": 5,
  "reason": "Wedding priority assignment"
}
```

**Response:**
```json
{
  "success": true,
  "part": {
    "id": 456,
    "assignedTo": 5,
    "assignedUser": {
      "id": 5,
      "name": "Mike Johnson"
    }
  },
  "message": "Tailor assigned successfully"
}
```

## Work Tracking

### Start Task
```http
POST /api/alterations/tasks/:taskId/start
```

**Request Body:**
```json
{
  "tailorId": 5,
  "notes": "Starting sleeve shortening for wedding jacket"
}
```

**Response:**
```json
{
  "success": true,
  "task": {
    "id": 789,
    "status": "IN_PROGRESS",
    "startTime": "2024-12-01T09:00:00Z",
    "assignedTo": 5,
    "assignedUser": {
      "id": 5,
      "name": "Mike Johnson"
    }
  },
  "message": "Task started successfully"
}
```

### Finish Task
```http
POST /api/alterations/tasks/:taskId/finish
```

**Request Body:**
```json
{
  "timeSpent": 45,
  "notes": "Sleeves shortened successfully",
  "initials": "MJ"
}
```

**Response:**
```json
{
  "success": true,
  "task": {
    "id": 789,
    "status": "COMPLETE",
    "finishTime": "2024-12-01T09:45:00Z",
    "timeSpent": 45,
    "initials": "MJ"
  },
  "message": "Task completed successfully"
}
```

## List and Search

### List All Alterations
```http
GET /api/alterations
```

**Query Parameters:**
- `status` (optional): Filter by status
- `tailorId` (optional): Filter by assigned tailor
- `customerId` (optional): Filter by customer
- `dueDate` (optional): Filter by due date

### Get Alterations by Member
```http
GET /api/alterations/member/:memberId
```

## Status Codes

### Success Responses
- `200 OK`: Request successful
- `201 Created`: Resource created successfully

### Error Responses
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Data Types

### Enums

#### AlterationJobStatus
```typescript
enum AlterationJobStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETE = 'COMPLETE',
  PICKED_UP = 'PICKED_UP',
  ON_HOLD = 'ON_HOLD'
}
```

#### GarmentPartType
```typescript
enum GarmentPartType {
  JACKET = 'JACKET',
  PANTS = 'PANTS',
  VEST = 'VEST',
  SHIRT = 'SHIRT',
  DRESS = 'DRESS',
  SKIRT = 'SKIRT',
  OTHER = 'OTHER'
}
```

#### TaskType
```typescript
enum TaskType {
  ALTERATION = 'ALTERATION',
  BUTTON_WORK = 'BUTTON_WORK',
  MEASUREMENT = 'MEASUREMENT',
  CUSTOM = 'CUSTOM'
}
```

#### PartPriority
```typescript
enum PartPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  RUSH = 'RUSH'
}
```

## Error Handling

### Standard Error Response
```json
{
  "error": "Error message description"
}
```

### Validation Error Response
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "tailorId",
      "message": "tailorId is required"
    }
  ]
}
```

## Rate Limiting

- **Default**: 100 requests per minute per IP
- **Authentication endpoints**: 10 requests per minute per IP
- **QR code scanning**: 60 requests per minute per IP

## Testing

### Test Scripts
```bash
# Test complete workflow
node test-tailor-workflow.js

# Test print formatting
node test-print-enhanced-tasks.js
```

### Example cURL Commands

#### Create Job
```bash
curl -X POST http://localhost:3000/api/alterations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "customerId": 1,
    "orderStatus": "ALTERATION_ONLY",
    "dueDate": "2024-12-08",
    "jobParts": [{
      "partName": "Test Jacket",
      "partType": "JACKET",
      "tasks": [{
        "taskName": "Test Task",
        "taskType": "alteration"
      }]
    }]
  }'
```

#### Assign Tailor
```bash
curl -X POST http://localhost:3000/api/alterations/parts/456/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "tailorId": 5,
    "reason": "Test assignment"
  }'
```

#### Start Task
```bash
curl -X POST http://localhost:3000/api/alterations/tasks/789/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "tailorId": 5,
    "notes": "Starting test task"
  }'
```

## Notes

- All timestamps are in ISO 8601 format (UTC)
- IDs are integers
- Time values are in minutes
- QR codes are auto-generated unique strings
- Job numbers follow format: `ALT-YYYY-NNN`
- All endpoints require appropriate permissions 
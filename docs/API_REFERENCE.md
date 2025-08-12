# SuitSync API Reference v2.0

## Overview

The SuitSync API provides comprehensive endpoints for managing customers, parties, alteration jobs, appointments, and integrations with Lightspeed X-Series. All endpoints require authentication unless otherwise specified.

## 🆕 What's New in v2.0
- ✅ **Fixed Lightspeed Integration** - Correct X-Series API endpoints
- ✅ **Enhanced Error Handling** - Standardized error responses with circuit breaker
- ✅ **Session Management** - Prevents header size issues (431 errors)
- ✅ **Database Error Handling** - Proper Prisma error management
- ✅ **API Compliance Audit** - Customers API 80% compliant with Lightspeed X-Series API 2.0

## 📋 API Compliance Status

| API Section | Compliance Score | Status | Notes |
|-------------|------------------|--------|-------|
| **Customers** | 80% | 🟡 Partial | Missing DELETE endpoint |
| **Parties** | TBD | ⏳ Pending | Audit needed |
| **Products** | TBD | ⏳ Pending | Audit needed |
| **Sales** | TBD | ⏳ Pending | Audit needed |

**Full compliance reports**: [Customers API Audit](./CUSTOMERS_API_AUDIT.md) | [Compliance Summary](./CUSTOMERS_API_COMPLIANCE_SUMMARY.md)

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication

SuitSync uses JWT-based authentication with HTTP-only cookies for web clients and Bearer tokens for API clients.

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "user@example.com",
  "role": "admin"
}
```

### Get Session
```http
GET /auth/session
Authorization: Bearer <token>
```

### Logout
```http
POST /auth/logout
```

## Rate Limiting

The API implements multiple rate limiting tiers:

- **General API**: 1000 requests per 15 minutes
- **Authentication**: 10 requests per 15 minutes
- **Creation endpoints**: 30 requests per minute
- **Sync operations**: 5 requests per 5 minutes

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "invalid_format"
    }
  ],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `413` - Request Entity Too Large
- `429` - Too Many Requests
- `500` - Internal Server Error

## Customers

### List Customers
```http
GET /customers?search=john&page=1&limit=50
```

**Query Parameters:**
- `search` (optional): Search by name, email, or phone
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)

**Response:**
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "address": "123 Main St",
    "lightspeedId": "ls-123",
    "lightspeedVersion": "1",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "syncedAt": "2024-01-01T00:00:00Z",
    "measurements": {
      "id": 1,
      "chest": "42",
      "waistJacket": "36",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
]
```

### Get Customer
```http
GET /customers/{id}
```

### Create Customer
```http
POST /customers
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "address": "123 Main St"
}
```

### Update Customer
```http
PUT /customers/{id}
Content-Type: application/json

{
  "name": "John Smith",
  "phone": "+1234567891"
}
```

### Delete Customer
```http
DELETE /customers/{id}
```

**⚠️ Implementation Status**: This endpoint is documented but not yet implemented. See [Compliance Summary](./CUSTOMERS_API_COMPLIANCE_SUMMARY.md) for implementation details.

## Parties

### List Parties
```http
GET /parties?customerId=1&page=1&limit=50
```

### Create Party
```http
POST /parties
Content-Type: application/json

{
  "name": "Wedding Party",
  "eventDate": "2024-12-31T18:00:00Z",
  "customerId": 1,
  "notes": "Special requirements"
}
```

## Alteration Jobs

### List Jobs
```http
GET /alterations/jobs?status=NOT_STARTED&tailorId=1&page=1&limit=50
```

**Query Parameters:**
- `status` (optional): Filter by status array
- `tailorId` (optional): Filter by assigned tailor
- `customerId` (optional): Filter by customer
- `partyId` (optional): Filter by party
- `includeParts` (optional): Include job parts in response

### Create Alteration Job
```http
POST /alterations/jobs
Content-Type: application/json

{
  "customerId": 1,
  "partyId": 1,
  "notes": "Hem pants, take in jacket",
  "dueDate": "2024-01-15T00:00:00Z",
  "rushOrder": false,
  "jobParts": [
    {
      "partName": "Jacket",
      "partType": "JACKET",
      "priority": "NORMAL",
      "estimatedTime": 120,
      "notes": "Take in sides"
    },
    {
      "partName": "Pants",
      "partType": "PANTS",
      "priority": "HIGH",
      "estimatedTime": 60,
      "notes": "Hem 2 inches"
    }
  ]
}
```

### Update Job Status
```http
PUT /alterations/jobs/{id}
Content-Type: application/json

{
  "status": "IN_PROGRESS",
  "tailorId": 2,
  "notes": "Started alterations"
}
```

## Appointments

### List Appointments
```http
GET /appointments?startDate=2024-01-01&endDate=2024-01-31&tailorId=1
```

### Create Appointment
```http
POST /appointments
Content-Type: application/json

{
  "partyId": 1,
  "dateTime": "2024-01-15T10:00:00Z",
  "durationMinutes": 60,
  "type": "fitting",
  "notes": "First fitting",
  "tailorId": 1
}
```

## Performance & Monitoring

### Get Performance Metrics
```http
GET /performance/metrics
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "database": {
    "connectionCount": 5,
    "slowQueries": [],
    "averageQueryTime": 45.2,
    "totalQueries": 1250,
    "health": {
      "customerCount": 150,
      "jobCount": 89,
      "appointmentCount": 45,
      "userCount": 8
    }
  },
  "cache": {
    "hits": 1200,
    "misses": 300,
    "hitRatio": 0.8,
    "size": 450
  },
  "memory": {
    "used": 52428800,
    "total": 134217728,
    "external": 1048576,
    "rss": 67108864
  },
  "uptime": 86400,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Get System Health
```http
GET /performance/health
Authorization: Bearer <admin-token>
```

### Clear Cache
```http
POST /performance/cache/clear
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "pattern": "customers:*"
}
```

## Lightspeed Integration

### Get Lightspeed Health
```http
GET /lightspeed/health
Authorization: Bearer <token>
```

### Trigger Sync
```http
POST /sync/trigger/{resource}
Authorization: Bearer <token>

# Resources: customers, sales, users
```

### Manual Sync Endpoints
```http
POST /sync/customers
POST /sync/sales  
POST /sync/users
Authorization: Bearer <token>
```

### Internal Sync Endpoints (No Auth Required)
```http
POST /sync/internal/customers
POST /sync/internal/sales
POST /sync/internal/users
```

### Manual Trigger with Resource
```http
POST /sync/manual/trigger
Content-Type: application/json

{
  "resource": "customers" | "sales" | "users"
}
```

## Webhooks

SuitSync supports webhooks for real-time updates from Lightspeed.

### Webhook Endpoint
```http
POST /webhooks/lightspeed
Content-Type: application/x-www-form-urlencoded
X-Lightspeed-Signature: sha256=<signature>

# Lightspeed webhook payload
```

All webhooks are verified using HMAC-SHA256 signatures.

## Data Models

### Customer
```typescript
interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  lightspeedId: string;
  lightspeedVersion?: bigint;
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
  createdBy?: number;
}
```

### AlterationJob
```typescript
interface AlterationJob {
  id: number;
  jobNumber: string;
  lightspeedServiceOrderId?: string;
  partyId?: number;
  customerId?: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE' | 'ON_HOLD' | 'CANCELLED';
  orderStatus: 'ALTERATION_ONLY' | 'SUIT_AND_ALTERATION';
  notes?: string;
  dueDate?: Date;
  rushOrder: boolean;
  qrCode: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Appointment
```typescript
interface Appointment {
  id: number;
  partyId: number;
  dateTime: Date;
  durationMinutes?: number;
  type: 'fitting' | 'pickup' | 'final_try' | 'other';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  tailorId?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://your-domain.com/api',
  withCredentials: true,
});

// Create customer
const customer = await api.post('/customers', {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
});

// Get alteration jobs
const jobs = await api.get('/alterations/jobs', {
  params: { status: ['NOT_STARTED', 'IN_PROGRESS'] }
});
```

### Python
```python
import requests

class SuitSyncAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {'Authorization': f'Bearer {token}'}

    def create_customer(self, customer_data):
        response = requests.post(
            f'{self.base_url}/customers',
            json=customer_data,
            headers=self.headers
        )
        return response.json()

    def get_jobs(self, **filters):
        response = requests.get(
            f'{self.base_url}/alterations/jobs',
            params=filters,
            headers=self.headers
        )
        return response.json()

# Usage
api = SuitSyncAPI('https://your-domain.com/api', 'your-token')
customer = api.create_customer({
    'name': 'John Doe',
    'email': 'john@example.com'
})
```

## Backend Dashboard

### GET /
- Returns the backend dashboard as an HTML page.
- Shows health/status for DB, Redis, Lightspeed, job scheduler, and app info.

### GET /api/admin/dashboard
- Returns the backend dashboard as an HTML page (same as `/`).

### GET /api/admin/dashboard.json
- Returns backend health/status as JSON for frontend or API use.

#### Example response:
```json
{
  "dbStatus": "ok",
  "dbTables": [ ... ],
  "redisStatus": "ok",
  "redisInfo": { ... },
  "lightspeed": { "status": "ok" },
  "jobs": [ ... ],
  "appInfo": { ... }
}
```

## Session & Auth
- Session cookies are `secure: false` in dev, `secure: true` in production.
- CORS allows credentials and uses `FRONTEND_URL` as the allowed origin.
- Frontend must send `credentials: 'include'` on all API requests.

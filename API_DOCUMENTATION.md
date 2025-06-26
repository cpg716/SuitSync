# SuitSync API Documentation

This document provides a detailed overview of the SuitSync REST API endpoints.

## Authentication

Most endpoints require authentication via a JSON Web Token (JWT). The token must be included in the `Authorization` header of your request as a Bearer token.

- **`Authorization: Bearer <your_jwt_token>`**

Endpoints are protected by different levels of authentication:
- **Public**: No authentication required.
- **User**: A valid JWT for any authenticated staff member is required.
- **Admin**: A valid JWT for a user with the `ADMIN` role is required.

---

## Endpoints

### 1. Auth (`/api/auth`)
Handles user authentication and session management.

- **`POST /api/auth/login`**
  - **Description**: Authenticates a user with email and password.
  - **Auth**: Public
  - **Returns**: `200 OK` with a JWT and user object.

- **`GET /api/auth/session`**
  - **Description**: Retrieves the current user's session data.
  - **Auth**: User
  - **Returns**: `200 OK` with the authenticated user's data.

- **`GET /api/auth/start`**
  - **Description**: Starts the Lightspeed OAuth 2.0 authorization flow by redirecting the user.
  - **Auth**: User
  - **Returns**: `302 Redirect` to the Lightspeed authorization URL.

- **`GET /api/auth/callback`**
  - **Description**: The callback URL for the Lightspeed OAuth flow. Exchanges the authorization code for an access token.
  - **Auth**: Public (via Lightspeed redirect)
  - **Returns**: `302 Redirect` to the frontend.

### 2. Admin (`/api/admin`)
Endpoints for administrative tasks.

- **`GET /api/admin/settings`**
  - **Description**: Retrieves all administrative settings.
  - **Auth**: Admin
  - **Returns**: `200 OK` with settings data.

- **`POST /api/admin/settings`**
  - **Description**: Updates administrative settings.
  - **Auth**: Admin
  - **Returns**: `200 OK` with the updated settings.

### 3. Alterations (`/api/alterations`)
Manages alteration jobs.

- **`GET /api/alterations`**
  - **Description**: Lists all alteration jobs. Supports filtering by status or assignee.
  - **Auth**: User
  - **Returns**: `200 OK` with a list of alteration jobs.

- **`POST /api/alterations`**
  - **Description**: Creates a new alteration job.
  - **Auth**: User
  - **Returns**: `201 Created` with the new job object.

### 4. Appointments (`/api/appointments`)
Manages customer appointments.

- **`GET /api/appointments`**
  - **Description**: Lists all upcoming appointments.
  - **Auth**: User
  - **Returns**: `200 OK` with a list of appointments.

- **`POST /api/appointments`**
  - **Description**: Schedules a new appointment.
  - **Auth**: User
  - **Returns**: `201 Created` with the new appointment object.

### 5. Customers (`/api/customers`)
Manages local customer data synced from Lightspeed.

- **`GET /api/customers`**
  - **Description**: Lists all customers from the local database.
  - **Auth**: User
  - **Returns**: `200 OK` with a paginated list of customers.

- **`GET /api/customers/:id`**
  - **Description**: Retrieves details for a single customer.
  - **Auth**: User
  - **Returns**: `200 OK` with the customer object.

### 6. Parties (`/api/parties`)
Manages customer parties (groups).

- **`GET /api/parties`**
  - **Description**: Lists all parties, including a count of their members.
  - **Auth**: User
  - **Returns**: `200 OK` with a list of parties.

- **`POST /api/parties`**
  - **Description**: Creates a new party. This also adds a corresponding tag to the customer in Lightspeed.
  - **Auth**: User
  - **Returns**: `201 Created` with the new party object.

- **`GET /api/parties/:id`**
  - **Description**: Retrieves full details for a single party, including members, appointments, and alteration jobs.
  - **Auth**: User
  - **Returns**: `200 OK` with the detailed party object.

### 7. Lightspeed (`/api/lightspeed`)
Endpoints for interacting directly with Lightspeed or checking integration health.

- **`GET /api/lightspeed/health`**
  - **Description**: Performs a health check of the Lightspeed API connection and reports the status of background sync jobs.
  - **Auth**: Admin
  - **Returns**: `200 OK` with the health status object.

### 8. Sync (`/api/sync`)
Manages the data synchronization between SuitSync and Lightspeed.

- **`POST /api/sync/trigger`**
  - **Description**: Manually triggers a background sync for a specified resource (e.g., `customers`, `products`).
  - **Auth**: Admin
  - **Body**: `{ "resource": "customers" }`
  - **Returns**: `202 Accepted` with a message that the sync has started.

---
This documentation provides a high-level overview. For details on request/response bodies, please refer to the JSDoc comments in the respective controller files in `server/controllers/`. 
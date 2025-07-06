# SuitSync Lightspeed X-Series Integration Guide

This document provides a definitive guide to the Lightspeed X-Series integration within the SuitSync application. It details the architecture, authentication flow, and best practices implemented in our system.

## Table of Contents
- [1. Environment Configuration](#1-environment-configuration)
- [2. Authentication Strategy](#2-authentication-strategy)
  - [2.1. User Authentication (OAuth 2.0)](#21-user-authentication-oauth-20)
  - [2.2. System Authentication (Personal Access Token)](#22-system-authentication-personal-access-token)
- [3. Core Integration Services](#3-core-integration-services)
  - [3.1. The API Client (`lightspeedClient.js`)](#31-the-api-client-lightspeedclientjs)
  - [3.2. Sync Service (`syncService.js`)](#32-sync-service-syncservicejs)
  - [3.3. Workflow Service (`workflowService.js`)](#33-workflow-service-workflowservicejs)
- [4. Validation & Testing Checklist](#4-validation--testing-checklist)
- [5. Critical Fixes & Troubleshooting](#5-critical-fixes--troubleshooting)

---

## 1. Environment Configuration

The entire integration relies on a correctly configured `.env` file in the project root.

```dotenv
# Lightspeed API Credentials
LS_DOMAIN="your-store" # e.g., "suitsync-demo"
LS_CLIENT_ID="your_lightspeed_client_id"
LS_CLIENT_SECRET="your_lightspeed_client_secret"
LS_REDIRECT_URI="http://localhost:3000/api/auth/callback"
LS_PERSONAL_ACCESS_TOKEN="your_lightspeed_personal_access_token_for_system_tasks"

# Application Settings
SESSION_SECRET="a_strong_and_long_random_string_for_sessions"
DATABASE_URL="file:./prisma/dev.db" # Use PostgreSQL in production
```

- `LS_DOMAIN`: The unique prefix for your Lightspeed store URL.
- `LS_CLIENT_ID` / `LS_CLIENT_SECRET`: Your OAuth application credentials.
- `LS_REDIRECT_URI`: Must exactly match the callback URL in your Lightspeed app settings.
- `LS_PERSONAL_ACCESS_TOKEN`: A long-lived token generated in the Lightspeed back office, used for background system tasks.
- `SESSION_SECRET`: Used to encrypt user session data.

---

## 2. Authentication Strategy

The application uses a dual-authentication strategy to interact with the Lightspeed API.

### 2.1. User Authentication (OAuth 2.0)

This is the standard flow for actions performed by a logged-in user.

1.  **Initiation**: The user is redirected from `/api/auth/start` to the Lightspeed authorization screen.
2.  **Callback**: Lightspeed redirects the user back to `/api/auth/callback` with an `authorization_code`.
3.  **Token Exchange**: The server exchanges this code for an `access_token` and `refresh_token` by making a `POST` request to `https://{LS_DOMAIN}.retail.lightspeed.app/oauth/token`.
4.  **Session Storage**: The `access_token` and `refresh_token` are stored securely in the user's encrypted session.

### 2.2. System Authentication (Personal Access Token)

For background processes like the initial data sync or scheduled jobs where no user session exists, the system uses the `LS_PERSONAL_ACCESS_TOKEN`. This token is injected directly into the API client, providing immediate, non-interactive authentication.

---

## 3. Core Integration Services

### 3.1. The API Client (`lightspeedClient.js`)

This is the heart of the integration. It's a centralized Axios client with critical features built-in:

- **Automated Token Refresh**: The client includes a response interceptor that detects `401 Unauthorized` errors. When a token expires, it automatically uses the `refresh_token` to fetch a new `access_token` from the `/api/1.0/token` endpoint and then retries the original request.
- **Rate Limit Handling**: A second interceptor watches for `429 Too Many Requests` errors. It implements an exponential backoff strategy, automatically waiting and retrying the request to handle API load gracefully.
- **Offset/Limit Pagination**: The `fetchAllWithPagination` method is implemented to correctly handle Lightspeed's offset/limit pagination (not version-based cursors).
- **Account ID Handling**: All API base URLs must include the correct Account ID, which is fetched after OAuth token exchange and stored in the session.

### 3.2. Sync Service (`syncService.js`)

This service is responsible for keeping the local database in sync with Lightspeed.

- **Scheduled Syncs**: Runs on a `setInterval` schedule to periodically sync `Customers` and `Products`.
- **Incremental Syncs**: It uses the `SyncStatus` model to track the `lastSyncedVersion` for each resource. This allows it to fetch only records that have changed since the last sync, making the process highly efficient.
- **Manual Triggers**: Can be triggered manually for a specific resource via the `/api/sync/trigger` endpoint.

### 3.3. Workflow Service (`workflowService.js`)

This service runs on server startup to ensure the Lightspeed environment is correctly configured for SuitSync.

- **Custom Field Verification**: It automatically checks for the existence of required custom fields (e.g., `suitsync_party_id` on customers) and logs their status.
- **Webhook Verification**: It ensures that the required webhooks (e.g., `sale.update`) are registered and pointing to the correct application URL.

---

## 4. Validation & Testing Checklist

To ensure the integration is functioning correctly, follow these steps:

1.  **Verify `.env`**: Confirm all variables in the `.env` file are set correctly.
2.  **Test OAuth Flow**:
    - Log in to the application.
    - Navigate to the Lightspeed connection page and initiate the connection.
    - You should be redirected to Lightspeed, prompted to authorize, and then redirected back successfully.
3.  **Check API Health**:
    - As an admin, navigate to the "Lightspeed Status" page in the UI.
    - The "API Connection" status should be "OK". If it shows an error, check the server logs for details.
4.  **Verify Sync Status**:
    - On the same status page, check the resource sync statuses. After the server has been running for a moment, they should show a `SUCCESS` status with a recent timestamp.
5.  **Test Token Refresh (Advanced)**:
    - After a successful OAuth connection, you can force a token to expire (e.g., by waiting or manually clearing it from the session store).
    - Making any subsequent API call from the UI should trigger the refresh flow automatically and succeed without any visible error to the user. 

---

## 5. Critical Fixes & Troubleshooting

### Correct OAuth URLs
- Use `https://{LS_DOMAIN}.retail.lightspeed.app/oauth/authorize` for authorization.
- Use `https://{LS_DOMAIN}.retail.lightspeed.app/oauth/token` for token exchange.

### Account ID Handling
- After token exchange, fetch the Account ID from the Lightspeed API and store it in the session for all subsequent API calls.

### Pagination
- Use offset/limit pagination for all resource fetches (not version-based cursors).

### Rate Limiting
- Handle `429 Too Many Requests` with exponential backoff and respect `retry-after` headers.

### Error Handling
- On `401 Unauthorized`, attempt token refresh and retry the request.
- On `429`, back off and retry after the specified delay.

### Common Issues
- **OAuth errors**: Double-check your client ID, secret, and redirect URI.
- **Account ID missing**: Ensure you fetch and store the Account ID after OAuth.
- **API base URL errors**: Always include the Account ID in the base URL.
- **Pagination errors**: Use offset/limit, not version cursors.
- **Rate limit errors**: Implement backoff and retry logic.

For more, see [README.md](../README.md) and [docs/API_REFERENCE.md](API_REFERENCE.md) 
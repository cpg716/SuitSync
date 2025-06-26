# SyncSuit Lightspeed X-Series OAuth 2.0 Integration Guide

This document outlines the step-by-step process for integrating OAuth 2.0 authorization with Lightspeed X-Series (Vend) in the SyncSuit application.

---

## Overview

Lightspeed X-Series uses an OAuth 2.0 authorization flow for secure, delegated access to a retailer’s data. SyncSuit must implement this flow to allow users to log in with their Lightspeed account and enable bi-directional data sync.

---

## 1. Register Your Application
- Register SyncSuit in the Lightspeed X-Series developer portal.
- Note your `client_id` and `client_secret`.
- Set the appropriate `redirect_uri` (where Lightspeed will send users after authorization).

---

## 2. OAuth 2.0 Authorization Flow

### Step 1: Redirect User to Lightspeed Authorization Endpoint
Send the user to:

```
https://x-series-api.lightspeedhq.com/connect?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI
```

- The user logs in and grants permission.

### Step 2: Handle Callback and Exchange Code for Tokens
After the user approves, Lightspeed redirects to your `redirect_uri` with a `code` parameter.

Make a POST request to exchange the code for tokens:

```
POST https://x-series-api.lightspeedhq.com/oauth/token
```

#### Payload:
```
grant_type=authorization_code
code=THE_CODE_FROM_CALLBACK
client_id=YOUR_CLIENT_ID
client_secret=YOUR_CLIENT_SECRET
redirect_uri=YOUR_REDIRECT_URI
```

#### Response:
- `access_token` (short-lived; used for API calls)
- `refresh_token` (used to obtain new access tokens)
- `expires_in` (token lifetime)
- User/store info

---

## 3. Secure Token Storage
- Store tokens securely on the server (never in the frontend/browser).
- Associate tokens with the user’s session or database record.

---

## 4. Making Authorized API Requests
- Every API call to Lightspeed must include:

```
Authorization: Bearer ACCESS_TOKEN
```

- Only use valid, non-expired tokens.

---

## 5. Refreshing Tokens
- When `access_token` expires, use the `refresh_token` to get a new one:

```
POST https://x-series-api.lightspeedhq.com/oauth/token
```

#### Payload:
```
grant_type=refresh_token
refresh_token=YOUR_REFRESH_TOKEN
client_id=YOUR_CLIENT_ID
client_secret=YOUR_CLIENT_SECRET
```

- Save the new tokens in place of the old ones.

---

## 6. Handling Authorization Errors
- If any API returns 401/403, attempt token refresh.
- If refresh fails, prompt user to re-authenticate.

---

## 7. Logout & Token Revocation
- On logout, clear all stored tokens from your backend.
- (If available, call any provided Lightspeed revocation endpoint.)

---

## 8. Security Notes
- Never expose `client_secret`, `refresh_token`, or raw `access_token` to the frontend/browser.
- Only manage Lightspeed tokens server-side.
- Always use HTTPS for all requests.

---

## 9. References
- [Lightspeed X-Series OAuth Documentation](https://x-series.developer.lightspeedhq.com/docs/authentication)
- [Lightspeed API Reference](https://x-series.developer.lightspeedhq.com/docs/get-started)

---

*Use this guide as the definitive reference for implementing and maintaining Lightspeed X-Series OAuth in SyncSuit. For updates, always consult the official Lightspeed docs.*

# Sync Service Architecture

## Overview
- Sync jobs run for all resources: customers, users, products, sales.
- Each resource has a row in the `SyncStatus` table, updated after every sync.
- Backend `/api/lightspeed/health` always returns all resources, with status and last sync time.
- Errors and API health are reported in the UI and logs.

## Cross-Platform
- All sync logic runs in Docker containers, compatible with Mac, Windows, and Linux.
- No OS-specific dependencies.

## Error Handling
- All sync errors are logged and surfaced in the UI.
- If a resource is missing from SyncStatus, status is 'IDLE'.

## See other docs for API, deployment, and troubleshooting details. 
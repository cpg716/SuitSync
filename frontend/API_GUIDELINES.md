# API Client Guidelines for SuitSync Frontend

## ⚠️ CRITICAL: Always Use These Patterns

To prevent recurring API configuration issues, **ALWAYS** follow these patterns when making API calls in the frontend.

## 1. For React Components with SWR

```typescript
import { api } from '../lib/apiClient';
import useSWR from 'swr';

// ✅ CORRECT - Use the configured api client
const { data, error } = useSWR('/api/users', (url) => api.get(url).then(res => res.data));
```

## 2. For Direct API Calls

```typescript
import { apiFetch } from '../lib/apiClient';

// ✅ CORRECT - Use apiFetch helper
const response = await apiFetch('/api/users');
const data = await response.json();

// ✅ CORRECT - With options
const response = await apiFetch('/api/users', {
  method: 'POST',
  body: JSON.stringify(userData)
});
```

## 3. For Axios Calls

```typescript
import { api } from '../lib/apiClient';

// ✅ CORRECT - Use the configured api client
const response = await api.get('/api/users');
const response = await api.post('/api/users', userData);
```

## ❌ NEVER DO THESE

```typescript
// ❌ WRONG - Direct fetch with hardcoded URL
fetch('http://localhost:3000/api/users')

// ❌ WRONG - Direct fetch with relative URL
fetch('/api/users')

// ❌ WRONG - New axios instance
axios.get('http://localhost:3000/api/users')

// ❌ WRONG - Relative URL without credentials
fetch('/api/users', { method: 'POST' })
```

## Why This Matters

1. **Environment Flexibility** - URLs are configured in one place
2. **Credentials Handling** - Session cookies are automatically included
3. **Error Handling** - Centralized error handling and retries
4. **Consistency** - All API calls follow the same pattern
5. **Maintainability** - Easy to update backend URL for different environments

## Configuration

The backend URL is configured in:
- `frontend/.env.local` - Development environment
- `frontend/lib/apiClient.ts` - API client configuration

## Available Helpers

- `api` - Configured axios instance with interceptors
- `apiFetch(path, options)` - Fetch wrapper with proper URL and credentials
- `getApiUrl(path)` - Get full URL for a given API path

## Migration Checklist

When you see API calls that don't follow these patterns:

1. ✅ Import the appropriate helper from `../lib/apiClient`
2. ✅ Replace hardcoded URLs with helper functions
3. ✅ Ensure credentials are included for authenticated endpoints
4. ✅ Test the API call works in development
5. ✅ Update any related error handling

## Common Patterns

### GET Request
```typescript
import { api } from '../lib/apiClient';
const { data } = await api.get('/api/users');
```

### POST Request
```typescript
import { apiFetch } from '../lib/apiClient';
const response = await apiFetch('/api/users', {
  method: 'POST',
  body: JSON.stringify(userData)
});
```

### DELETE Request
```typescript
import { api } from '../lib/apiClient';
await api.delete(`/api/users/${userId}`);
```

### SWR Hook
```typescript
import { api } from '../lib/apiClient';
import useSWR from 'swr';

const { data, error, mutate } = useSWR('/api/users', 
  (url) => api.get(url).then(res => res.data)
);
```

---

**Remember: Consistency prevents bugs. Always use the configured API client!**

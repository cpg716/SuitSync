# Lightspeed X-Series API Integration Fixes

## Critical Issues Found

### 1. **Wrong OAuth URLs**
Current code uses incorrect OAuth endpoints:
```typescript
// WRONG - Current implementation
const authUrl = new URL(`https://secure.retail.lightspeed.app/connect`);

// CORRECT - Should be
const authUrl = new URL(`https://cloud.lightspeedapp.com/oauth/authorize.php`);
```

### 2. **Wrong Token Exchange URL**
```typescript
// WRONG - Current implementation
const tokenUrl = `https://${domainPrefix}.retail.lightspeed.app/api/1.0/token`;

// CORRECT - Should be
const tokenUrl = `https://cloud.lightspeedapp.com/oauth/access_token.php`;
```

### 3. **Wrong API Base URL**
```typescript
// WRONG - Current implementation
baseURL: `https://${domainPrefix}.retail.lightspeed.app/api/2.0`

// CORRECT - Should be
baseURL: `https://api.lightspeedapp.com/API/V3/Account/${accountID}`
```

### 4. **Missing Account ID Handling**
Lightspeed X-Series requires Account ID in API calls, which is missing.

### 5. **Incorrect Pagination Logic**
Current pagination uses version-based cursors, but X-Series uses offset/limit.

## Required Fixes

### Fix 1: Update OAuth URLs
```typescript
// backend/src/controllers/lightspeedAuthController.ts
export const redirectToLightspeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.lsAuthState = state;
    
    // FIXED: Correct OAuth URL
    const authUrl = new URL('https://cloud.lightspeedapp.com/oauth/authorize.php');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', LS_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', LS_REDIRECT_URI);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', 'employee:all'); // Add required scope
    
    res.redirect(authUrl.toString());
  } catch (error) {
    logger.error('Error initiating Lightspeed auth redirect:', error);
    res.status(500).send('Failed to start Lightspeed authentication.');
  }
};
```

### Fix 2: Update Token Exchange
```typescript
// backend/src/controllers/lightspeedAuthController.ts
const tokenResponse = await axios.post(
  'https://cloud.lightspeedapp.com/oauth/access_token.php',
  querystring.stringify({
    client_id: LS_CLIENT_ID,
    client_secret: LS_CLIENT_SECRET,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: LS_REDIRECT_URI,
  }),
  { 
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    } 
  }
);
```

### Fix 3: Update API Client
```typescript
// backend/src/lightspeedClient.ts
function createAxiosInstance(req: any): AxiosInstance {
  const accessToken = getAccessToken(req);
  const accountID = req.session?.lsAccountID || process.env.LS_ACCOUNT_ID;
  
  if (!accessToken || !accountID) {
    throw new Error('No Lightspeed session or account ID');
  }
  
  return axios.create({
    baseURL: `https://api.lightspeedapp.com/API/V3/Account/${accountID}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000, // Add timeout
  });
}
```

### Fix 4: Update Pagination
```typescript
// backend/src/lightspeedClient.ts
const fetchAllWithPagination = async (endpoint: string, initialParams: any = {}): Promise<any[]> => {
  let allItems: any[] = [];
  let offset = 0;
  const limit = 100; // X-Series max limit
  let hasMore = true;

  while (hasMore) {
    try {
      const params = { 
        ...initialParams, 
        offset, 
        limit,
        load_relations: 'all' // Load related data
      };
      
      const response = await requestWithRefresh('get', endpoint, undefined, params);
      if (!response?.data) throw new Error('No response from Lightspeed');

      const items = response.data;
      
      if (Array.isArray(items) && items.length > 0) {
        allItems = allItems.concat(items);
        offset += items.length;
        hasMore = items.length === limit; // Continue if we got full page
      } else {
        hasMore = false;
      }
    } catch (error: any) {
      console.error(`Error during paginated fetch for ${endpoint}:`, error);
      throw error;
    }
  }

  return allItems;
};
```

### Fix 5: Add Account ID Extraction
```typescript
// backend/src/controllers/lightspeedAuthController.ts
// After getting access token, fetch account info
try {
  const accountResponse = await axios.get('https://api.lightspeedapp.com/API/V3/Account.json', {
    headers: { Authorization: `Bearer ${access_token}` }
  });
  
  const accountID = accountResponse.data.Account?.accountID;
  if (!accountID) throw new Error('Could not get account ID');
  
  req.session.lsAccountID = accountID;
  
} catch (error) {
  logger.error('Failed to get account ID:', error);
  // Handle error appropriately
}
```

### Fix 6: Update Rate Limit Headers
```typescript
// X-Series uses different rate limit headers
if (response?.headers['x-ls-api-bucket-level']) {
  const bucketLevel = response.headers['x-ls-api-bucket-level'];
  const drillLevel = response.headers['x-ls-api-drilldown-level'];
  console.debug(`Rate limit - Bucket: ${bucketLevel}, Drilldown: ${drillLevel}`);
}
```

### Fix 7: Add Proper Error Handling
```typescript
// Handle X-Series specific errors
if (err.response?.status === 401) {
  // Token expired or invalid
  if (err.response.data?.message?.includes('expired')) {
    // Attempt token refresh
  }
} else if (err.response?.status === 429) {
  // Rate limited - X-Series has bucket system
  const retryAfter = err.response.headers['retry-after'] || 60;
  await delay(retryAfter * 1000);
}
```

## Environment Variables to Add
```bash
# Add to .env
LS_ACCOUNT_ID=your_account_id_here
LS_API_VERSION=V3
```

## Testing the Fixes
1. Update OAuth flow to use correct URLs
2. Test token exchange with new endpoint
3. Verify API calls work with Account ID
4. Test pagination with offset/limit
5. Verify rate limiting works correctly

## Migration Steps
1. Update all OAuth URLs
2. Add account ID extraction
3. Update API base URLs
4. Fix pagination logic
5. Update rate limit handling
6. Test thoroughly with Lightspeed sandbox
import axios, { AxiosInstance, AxiosError } from 'axios';
import querystring from 'querystring';

function getDomainPrefix(req: any) {
  return req?.session?.lsDomainPrefix || process.env.LS_DOMAIN;
}

function getAccessToken(req: any) {
  return req?.session?.lsAccessToken;
}

function getRefreshToken(req: any) {
  return req?.session?.lsRefreshToken;
}

async function refreshAccessToken(req: any) {
  const domainPrefix = getDomainPrefix(req);
  const refreshToken = getRefreshToken(req);
  const LS_CLIENT_ID = process.env.LS_CLIENT_ID || '';
  const LS_CLIENT_SECRET = process.env.LS_CLIENT_SECRET || '';
  if (!domainPrefix || !refreshToken) throw new Error('Missing domain or refresh token for Lightspeed refresh');
  const tokenUrl = `https://${domainPrefix}.retail.lightspeed.app/api/1.0/token`;
  const response = await axios.post(
    tokenUrl,
    querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: LS_CLIENT_ID,
      client_secret: LS_CLIENT_SECRET,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  req.session.lsAccessToken = response.data.access_token;
  req.session.lsRefreshToken = response.data.refresh_token;
  return response.data.access_token;
}

function createAxiosInstance(req: any): AxiosInstance {
  const domainPrefix = getDomainPrefix(req);
  const accessToken = getAccessToken(req);
  if (!domainPrefix || !accessToken) throw new Error('No Lightspeed session');
  return axios.create({
    baseURL: `https://${domainPrefix}.retail.lightspeed.app/api/2.0`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  });
}

export function createLightspeedClient(req: any) {
  let client = createAxiosInstance(req);

  async function requestWithRefresh(method: string, endpoint: string, data?: any, params?: any) {
    try {
      if (method === 'get') {
        return await client.get(endpoint, { params });
      } else if (method === 'post') {
        return await client.post(endpoint, data);
      } else if (method === 'put') {
        return await client.put(endpoint, data);
      }
    } catch (error) {
      const err = error as AxiosError;
      if (err.response?.status === 401 && !req._retry) {
        req._retry = true;
        const newToken = await refreshAccessToken(req);
        client = createAxiosInstance(req); // update client with new token
        if (method === 'get') {
          return await client.get(endpoint, { params });
        } else if (method === 'post') {
          return await client.post(endpoint, data);
        } else if (method === 'put') {
          return await client.put(endpoint, data);
        }
      }
      throw error;
    }
  }

  return {
    get: (endpoint: string, params?: any) => requestWithRefresh('get', endpoint, undefined, params),
    post: (endpoint: string, data: any) => requestWithRefresh('post', endpoint, data),
    put: (endpoint: string, data: any) => requestWithRefresh('put', endpoint, data),
    fetchAllWithPagination: async (endpoint: string, params: any) => {
      const response = await requestWithRefresh('get', endpoint, undefined, params);
      if (!response) throw new Error('No response from Lightspeed');
      const { data } = response;
      return data;
    },
    getCustomers: async () => {
      const response = await requestWithRefresh('get', '/customers');
      if (!response) throw new Error('No response from Lightspeed');
      const { data } = response;
      return data;
    },
  };
}

export async function searchLightspeed(client: any, resource: string, query: any) {
  const { data } = await client.get(`/${resource}`, { params: query });
  return data;
}

export async function setCustomFieldValue(_session: any, _payload: any) {
  return {};
}

export async function createServiceOrder(_session: any, _payload: any) {
  return { data: { service_order: { id: 1 } } };
} 
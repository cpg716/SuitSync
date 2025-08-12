import axios, { AxiosInstance } from 'axios';
import { config, isClientInstallation } from '../utils/config';
import logger from '../utils/logger';

interface ServerResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface SyncRequest {
  resource: string;
  lastSyncTimestamp?: string;
  data?: any;
}

interface SyncResponse {
  success: boolean;
  data?: any;
  lastSyncTimestamp: string;
  hasChanges: boolean;
}

class ClientServerService {
  private serverClient: AxiosInstance | null = null;
  private isConnected: boolean = false;
  private lastConnectionCheck: number = 0;
  private connectionCheckInterval: number = 30000; // 30 seconds

  constructor() {
    if (isClientInstallation() && config.SUITSYNC_SERVER_URL) {
      this.initializeServerClient();
    }
  }

  private initializeServerClient() {
    if (!config.SUITSYNC_SERVER_URL) {
      logger.error('No server URL configured for client installation');
      return;
    }

    this.serverClient = axios.create({
      baseURL: config.SUITSYNC_SERVER_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': config.SUITSYNC_INSTALL_TYPE,
        'X-Instance-ID': config.SUITSYNC_INSTANCE_ID || 'unknown',
      },
    });

    // Add request interceptor for authentication
    this.serverClient.interceptors.request.use(
      (config) => {
        // Add any client-specific headers or authentication
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.serverClient.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('Server communication error:', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
        });
        this.isConnected = false;
        return Promise.reject(error);
      }
    );

    // Test connection
    this.testConnection();
  }

  async testConnection(): Promise<boolean> {
    if (!this.serverClient) {
      return false;
    }

    try {
      const response = await this.serverClient.get('/api/health');
      this.isConnected = response.status === 200;
      this.lastConnectionCheck = Date.now();
      
      if (this.isConnected) {
        logger.info('Successfully connected to SuitSync server');
      }
      
      return this.isConnected;
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to SuitSync server:', error);
      return false;
    }
  }

  async isServerAvailable(): Promise<boolean> {
    if (!this.serverClient) {
      return false;
    }

    // Check if we need to refresh connection status
    if (Date.now() - this.lastConnectionCheck > this.connectionCheckInterval) {
      await this.testConnection();
    }

    return this.isConnected;
  }

  async fetchFromServer<T>(endpoint: string, options?: any): Promise<T | null> {
    if (!this.serverClient || !await this.isServerAvailable()) {
      logger.error('Cannot fetch from server: not connected');
      return null;
    }

    try {
      const response = await this.serverClient.get(endpoint, options);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch from server endpoint ${endpoint}:`, error);
      return null;
    }
  }

  async postToServer<T>(endpoint: string, data: any, options?: any): Promise<T | null> {
    if (!this.serverClient || !await this.isServerAvailable()) {
      logger.error('Cannot post to server: not connected');
      return null;
    }

    try {
      const response = await this.serverClient.post(endpoint, data, options);
      return response.data;
    } catch (error) {
      logger.error(`Failed to post to server endpoint ${endpoint}:`, error);
      return null;
    }
  }

  async syncData(resource: string, lastSyncTimestamp?: string): Promise<SyncResponse | null> {
    const syncRequest: SyncRequest = {
      resource,
      lastSyncTimestamp,
    };

    try {
      const response = await this.postToServer<SyncResponse>('/api/sync/client', syncRequest);
      return response;
    } catch (error) {
      logger.error(`Failed to sync ${resource}:`, error);
      return null;
    }
  }

  async sendDataToServer(endpoint: string, data: any): Promise<boolean> {
    try {
      const response = await this.postToServer(endpoint, data);
      return response !== null;
    } catch (error) {
      logger.error(`Failed to send data to server endpoint ${endpoint}:`, error);
      return false;
    }
  }

  // Get server status information
  async getServerStatus(): Promise<any> {
    return await this.fetchFromServer('/api/health');
  }

  // Get installation info for this client
  getClientInfo() {
    return {
      type: config.SUITSYNC_INSTALL_TYPE,
      instanceId: config.SUITSYNC_INSTANCE_ID || 'unknown',
      serverUrl: config.SUITSYNC_SERVER_URL,
      isConnected: this.isConnected,
      lastConnectionCheck: this.lastConnectionCheck,
    };
  }
}

// Export singleton instance
export const clientServerService = new ClientServerService();
export default clientServerService; 
import type { NextApiRequest, NextApiResponse } from 'next';

interface SyncStatusResponse {
  status: 'ok';
  timestamp: string;
  synced: boolean;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<SyncStatusResponse | { error: string }>
) {
  try {
    const response: SyncStatusResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      synced: true,
    };
    res.status(200).json(response);
  } catch (error) {
    console.error('Error in /api/sync/status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
} 
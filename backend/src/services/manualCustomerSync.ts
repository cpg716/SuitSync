import { syncCustomers } from './syncService';

(async () => {
  try {
    console.log('[ManualSync] Triggering manual customer sync...');
    await syncCustomers({});
    console.log('[ManualSync] Manual customer sync completed.');
    process.exit(0);
  } catch (error) {
    console.error('[ManualSync] Manual customer sync failed:', error);
    process.exit(1);
  }
})(); 
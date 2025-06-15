// helpers for Lightspeed sync
module.exports = {};

async function syncCustomers() {
  // TODO: Fetch customers from Lightspeed and upsert into local DB
  console.log('Syncing customers from Lightspeed...');
}

async function syncSales() {
  // TODO: Fetch sales from Lightspeed and upsert into local DB
  console.log('Syncing sales from Lightspeed...');
}

async function syncLineItems() {
  // TODO: Fetch line items from Lightspeed and upsert into local DB
  console.log('Syncing line items from Lightspeed...');
}

async function syncEvents() {
  // TODO: Fetch events from Lightspeed and upsert into local DB
  console.log('Syncing events from Lightspeed...');
}

module.exports = {
  syncCustomers,
  syncSales,
  syncLineItems,
  syncEvents,
};

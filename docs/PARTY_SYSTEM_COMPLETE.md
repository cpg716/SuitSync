# SuitSync Party System - Complete Implementation

## Overview

The SuitSync Party System is fully integrated with Lightspeed X-Series Customer Groups API 2.0+, providing bidirectional synchronization between local parties and Lightspeed customer groups. This system manages wedding parties, their members, and all associated business processes.

## Lightspeed X-Series API 2.0+ Integration

### Customer Groups Endpoints Used

Our party system uses the following Lightspeed X-Series API 2.0+ endpoints:

- **List Customer Groups**: `GET /api/2.0/customer_groups`
- **Create Customer Group**: `POST /api/2.0/customer_groups`
- **Get Customer Group**: `GET /api/2.0/customer_groups/{id}`
- **Update Customer Group**: `PUT /api/2.0/customer_groups/{id}`
- **Delete Customer Group**: `DELETE /api/2.0/customer_groups/{id}`
- **Get Customers for Group**: `GET /api/2.0/customer_groups/{id}/customers`
- **Add Customers to Group**: `POST /api/2.0/customer_groups/{id}/customers`
- **Delete Customers from Group**: `DELETE /api/2.0/customer_groups/{id}/customers`

### API Implementation Details

#### Creating a Party (Customer Group)

```typescript
// 1. Create local party record
const party = await prisma.party.create({
  data: {
    eventDate: new Date(eventDate),
    notes: notes || '',
    suitStyle: suitStyle || '',
    suitColor: suitColor || '',
    salesPersonId: Number(salesPersonId),
    customerId: Number(partyCustomerId),
  },
});

// 2. Create Lightspeed Customer Group
const groupName = `${groomLastName} ${formattedDate}`;
const response = await lightspeedClient.post('/customer_groups', { 
  name: groupName,
  description: `SuitSync Party: ${notes} | Style: ${suitStyle} | Color: ${suitColor}`
});

// 3. Link local party to Lightspeed group
await prisma.party.update({
  where: { id: party.id },
  data: { lightspeedGroupId: String(response.data.id) },
});
```

#### Adding Members to Party

```typescript
// 1. Create/get customer in Lightspeed
const customerData = {
  first_name: firstName,
  last_name: lastName,
  contact: {
    emails: email ? [{ address: email, type: 'primary' }] : [],
    phones: [{ number: phone, type: 'mobile' }],
  }
};
const customerResponse = await lightspeedClient.post('/customers', customerData);

// 2. Add customer to Lightspeed Customer Group
await lightspeedClient.post(`/customer_groups/${party.lightspeedGroupId}/customers`, {
  customer_ids: [customerResponse.data.id]
});

// 3. Create local party member
const member = await prisma.partyMember.create({
  data: {
    partyId: party.id,
    role: member.role,
    lsCustomerId: String(customerResponse.data.id),
    notes: `Name: ${member.fullName}, Phone: ${member.phone}`,
    status: 'Selected'
  }
});
```

#### Updating a Party

```typescript
// 1. Update local party
const updatedParty = await prisma.party.update({
  where: { id: Number(id) },
  data: { name, eventDate, notes, suitStyle, suitColor }
});

// 2. Update Lightspeed Customer Group
if (party.lightspeedGroupId) {
  const groupName = name || `${party.customer?.name || 'Party'} ${eventDate}`;
  const groupDescription = `SuitSync Party: ${notes} | Style: ${suitStyle} | Color: ${suitColor}`;
  
  await lightspeedClient.put(`/customer_groups/${party.lightspeedGroupId}`, {
    name: groupName,
    description: groupDescription
  });
}
```

#### Deleting a Party

```typescript
// 1. Remove all customers from Lightspeed Customer Group
const groupCustomers = await lightspeedClient.get(`/customer_groups/${party.lightspeedGroupId}/customers`);
if (groupCustomers?.data?.data) {
  const customerIds = groupCustomers.data.data.map(customer => customer.id);
  if (customerIds.length > 0) {
    await lightspeedClient.delete(`/customer_groups/${party.lightspeedGroupId}/customers`, {
      data: { customer_ids: customerIds }
    });
  }
}

// 2. Delete Lightspeed Customer Group
await lightspeedClient.delete(`/customer_groups/${party.lightspeedGroupId}`);

// 3. Delete local party (cascades to members)
await prisma.party.delete({ where: { id: Number(id) } });
```

#### Removing Members from Party

```typescript
// 1. Remove from Lightspeed Customer Group
if (member.party.lightspeedGroupId && member.lsCustomerId) {
  await lightspeedClient.delete(`/customer_groups/${member.party.lightspeedGroupId}/customers`, {
    data: { customer_ids: [member.lsCustomerId] }
  });
}

// 2. Delete local party member
await prisma.partyMember.delete({ where: { id: Number(memberId) } });
```

## API Endpoints

### Party Management

- `GET /api/parties` - List all parties with Lightspeed sync status
- `GET /api/parties/:id` - Get party details
- `POST /api/parties` - Create new party (creates Lightspeed Customer Group)
- `PUT /api/parties/:id` - Update party (updates Lightspeed Customer Group)
- `DELETE /api/parties/:id` - Delete party (deletes Lightspeed Customer Group)

### Member Management

- `GET /api/parties/:id/members` - List party members
- `POST /api/parties/:id/members` - Add member to party (adds to Lightspeed Customer Group)
- `PUT /api/parties/:id/members/:memberId` - Update member details
- `DELETE /api/parties/:id/members/:memberId` - Remove member from party (removes from Lightspeed Customer Group)

### Status Management

- `GET /api/parties/:id/status-summary` - Get party status summary
- `PUT /api/parties/members/:memberId/status` - Update member status
- `PUT /api/parties/:partyId/members/:memberId/measurements` - Update member measurements

### Progress & Gauges

We compute party progress using appointment/workflow stages per member:

1. Selected → 2. Measured → 3. Ordered → 4. Fitted → 5. Altered → 6. Ready → 7. PickedUp

For each party, gauges display the percentage of members at or beyond each step (Measurements, Ordering, Fitting, Alteration, Pickup).

Endpoints:
- `GET /api/progress/parties/:partyId` returns per-member progress and overall party completion stats.

UI:
- The party dashboard renders compact gauges with icons and member-level badges.

## Error Handling

The system includes comprehensive error handling:

1. **Lightspeed API Failures**: Local operations continue even if Lightspeed operations fail
2. **Rollback on Failure**: If party creation fails, local records are cleaned up
3. **Graceful Degradation**: System works offline with local data only
4. **Audit Logging**: All changes are logged for tracking and debugging

## Data Synchronization

### Bidirectional Sync

- **Local → Lightspeed**: All party and member changes are immediately synced to Lightspeed
- **Lightspeed → Local**: Customer data is synced during customer sync operations
- **Conflict Resolution**: Local data takes precedence for party management

### Sync Status Tracking

Each party tracks its sync status:
- `lightspeedGroupId`: Links to Lightspeed Customer Group
- `lastSyncedAt`: Timestamp of last successful sync
- Error handling for failed syncs

## Security & Permissions

- **Authentication Required**: All endpoints require valid session
- **Permission-Based Access**: Different permission levels for read/write operations
- **Audit Trail**: All changes logged with user and timestamp
- **Data Validation**: Input validation for all party and member data

## Performance Considerations

- **Batch Operations**: Customer creation and group management optimized
- **Pagination**: Large customer lists handled efficiently
- **Caching**: Local data cached to reduce API calls
- **Background Processing**: Non-critical operations processed asynchronously

This implementation ensures full compliance with Lightspeed X-Series API 2.0+ specifications while providing a robust, scalable party management system. 
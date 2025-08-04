# SuitSync Party System - Quick Reference

## Party Creation Checklist

### Required Fields
- [ ] **Groom** (name, phone, email optional)
- [ ] **Sales Person** assigned
- [ ] **Wedding Date** selected
- [ ] **At least one member** added

### Optional Fields
- [ ] **Suit Details** (Item, Style, Color)
- [ ] **Additional Members** (best man, groomsmen, etc.)
- [ ] **Notes** about the party

## Access Points

### Create Party
- **Dashboard**: "Create Party" button
- **Parties List**: "+ Add Party" button  
- **Direct URL**: `/create-party`

### Manage Parties
- **List View**: `/parties`
- **Detail View**: `/parties/[id]`
- **Edit Party**: Use edit button in list/detail view

## Member Roles

| Role | Description | Required |
|------|-------------|----------|
| `GROOM` | Primary customer | ✅ Yes |
| `BEST_MAN` | Best man | ❌ No |
| `GROOMSMAN` | Groomsman | ❌ No |
| `FATHER` | Father of groom | ❌ No |
| `BROTHER` | Brother of groom | ❌ No |
| `OTHER` | Other family/friends | ❌ No |

## Member Statuses

| Status | Description | Color |
|--------|-------------|-------|
| `Selected` | Initial status | Gray |
| `awaiting_measurements` | Needs measurements | Red |
| `need_to_order` | Ready to order | Orange |
| `ordered` | Suit ordered | Blue |
| `received` | Suit received | Purple |
| `being_altered` | Alterations in progress | Yellow |
| `ready_for_pickup` | Ready for pickup | Green |

## Lightspeed Integration

### Customer Group Naming
**Format**: `{LastName} {MM/DD/YY}`

**Examples:**
- Smith 02/25/26
- Samson 05/02/27
- Johnson 12/15/25

### Automatic Creation
- ✅ **Groom** → Lightspeed Customer
- ✅ **All Members** → Lightspeed Customers  
- ✅ **Party** → Lightspeed Customer Group
- ✅ **Group Membership** → All members added to group

## Suit Details

### Party Defaults
- **Suit Item**: 2-Piece Suit, 3-Piece Suit, Tuxedo
- **Suit Style**: Classic, Modern, Slim Fit
- **Suit Color**: Navy, Charcoal, Black

### Member Overrides
- Each member can have unique suit preferences
- Overrides party defaults when specified
- Displayed in member cards

## Common Actions

### Party Creation
1. Add groom (search existing or enter manually)
2. Assign sales person
3. Set wedding date
4. Add suit details (optional)
5. Add additional members
6. Submit party

### Member Management
1. Update status as work progresses
2. Add measurements when taken
3. Schedule appointments
4. Create alteration jobs
5. Track time spent

### Status Updates
1. Click member in party detail view
2. Select new status from dropdown
3. Add notes if needed
4. Save changes

## Error Resolution

### "Groom is required"
- Add groom before submitting party
- Ensure groom has name and phone

### "Failed to create party"
- Check all required fields
- Verify Lightspeed connectivity
- Check database connection

### "Customer not found"
- Verify customer exists in Lightspeed
- Check customer ID format
- Retry customer search

## API Endpoints

### Core Operations
```
POST   /api/parties              # Create party
GET    /api/parties              # List parties
GET    /api/parties/:id          # Get party detail
PUT    /api/parties/:id          # Update party
DELETE /api/parties/:id          # Delete party
```

### Member Operations
```
POST   /api/parties/:id/members                    # Add member
PUT    /api/parties/:id/members/:memberId          # Update member
DELETE /api/parties/:id/members/:memberId          # Remove member
PUT    /api/parties/:id/members/:memberId/status   # Update status
```

## Database Tables

### Party
- `id`, `eventDate`, `customerId`, `salesPersonId`
- `suitItem`, `suitStyle`, `suitColor`, `notes`
- `lightspeedGroupId`, `createdAt`, `updatedAt`

### PartyMember
- `id`, `partyId`, `role`, `lsCustomerId`
- `status`, `notes`, `suitItem`, `suitStyle`, `suitColor`
- `createdAt`, `updatedAt`

## Best Practices

### Party Creation
- Always add groom first
- Use existing customers when possible
- Set party-level suit defaults
- Add all members at creation

### Member Management
- Update status regularly
- Use consistent naming
- Include contact information
- Set individual suit preferences when needed

### Lightspeed Integration
- Monitor API responses
- Use consistent naming conventions
- Verify customer creation
- Check group membership

---

*For detailed information, see the complete Party System Documentation.* 
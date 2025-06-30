-- SuitSync Demo Data Cleanup Script
-- This script removes all demo/test data while preserving real Lightspeed users and data

-- Start transaction to ensure atomicity
BEGIN;

-- 1. Delete alteration jobs associated with demo parties or demo customers
DELETE FROM "AlterationJob" 
WHERE "partyId" IN (
    SELECT id FROM "Party" WHERE name LIKE 'Demo%'
) OR "customerId" IN (
    SELECT id FROM "Customer" WHERE email LIKE '%@demo.com'
);

-- 2. Delete appointments associated with demo parties or demo tailors
DELETE FROM "Appointment" 
WHERE "partyId" IN (
    SELECT id FROM "Party" WHERE name LIKE 'Demo%'
) OR "tailorId" IN (
    SELECT id FROM "User" WHERE email LIKE '%@demo.com'
);

-- 3. Delete party members associated with demo parties
DELETE FROM "PartyMember" 
WHERE "partyId" IN (
    SELECT id FROM "Party" WHERE name LIKE 'Demo%'
);

-- 4. Delete sale assignments for demo users
DELETE FROM "SaleAssignment" 
WHERE "associateId" IN (
    SELECT id FROM "User" WHERE email LIKE '%@demo.com'
);

-- 5. Delete demo parties
DELETE FROM "Party" WHERE name LIKE 'Demo%';

-- 6. Delete demo customers
DELETE FROM "Customer" WHERE email LIKE '%@demo.com';

-- 7. Remove skill associations for demo users
DELETE FROM "_SkillToUser" 
WHERE "B" IN (
    SELECT id FROM "User" WHERE email LIKE '%@demo.com'
);

-- 8. Delete demo users (but keep real Lightspeed users)
DELETE FROM "User" WHERE email LIKE '%@demo.com';

-- 9. Clean up any orphaned skills (optional - only if no users are associated)
DELETE FROM "Skill" 
WHERE id NOT IN (
    SELECT DISTINCT "A" FROM "_SkillToUser"
);

-- 10. Clean up audit logs for demo data (optional)
-- Note: Check if AuditLog table exists and has the expected columns
DELETE FROM "AuditLog"
WHERE "userId" NOT IN (
    SELECT id FROM "User"
);

-- Commit the transaction
COMMIT;

-- Display remaining data counts
SELECT 
    'Users' as table_name,
    COUNT(*) as count,
    STRING_AGG(email, ', ') as emails
FROM "User"
UNION ALL
SELECT 
    'Customers' as table_name,
    COUNT(*) as count,
    CASE WHEN COUNT(*) > 5 THEN CONCAT(COUNT(*)::text, ' customers') ELSE STRING_AGG(email, ', ') END
FROM "Customer"
UNION ALL
SELECT 
    'Parties' as table_name,
    COUNT(*) as count,
    CASE WHEN COUNT(*) > 5 THEN CONCAT(COUNT(*)::text, ' parties') ELSE STRING_AGG(name, ', ') END
FROM "Party"
UNION ALL
SELECT 
    'Alteration Jobs' as table_name,
    COUNT(*) as count,
    CONCAT(COUNT(*)::text, ' jobs')
FROM "AlterationJob"
UNION ALL
SELECT 
    'Appointments' as table_name,
    COUNT(*) as count,
    CONCAT(COUNT(*)::text, ' appointments')
FROM "Appointment";

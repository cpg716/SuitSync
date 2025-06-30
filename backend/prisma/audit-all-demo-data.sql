-- SuitSync Complete Demo Data Audit Script
-- This script checks ALL tables for any remaining demo/test data

-- Check for demo data patterns across all tables
SELECT 'DEMO DATA AUDIT REPORT' as report_title;

-- 1. Users with demo emails
SELECT 'Users with demo emails:' as check_name, COUNT(*) as count
FROM "User" 
WHERE email LIKE '%@demo.com' OR email LIKE '%demo%' OR email LIKE '%test%';

-- 2. Customers with demo emails or names
SELECT 'Customers with demo data:' as check_name, COUNT(*) as count
FROM "Customer" 
WHERE email LIKE '%@demo.com' OR email LIKE '%demo%' OR email LIKE '%test%' 
   OR name LIKE '%Demo%' OR name LIKE '%Test%' OR name LIKE 'Customer %';

-- 3. Parties with demo names
SELECT 'Parties with demo names:' as check_name, COUNT(*) as count
FROM "Party" 
WHERE name LIKE '%Demo%' OR name LIKE '%Test%' OR name LIKE 'Demo Wedding %';

-- 4. Products with demo names
SELECT 'Products with demo data:' as check_name, COUNT(*) as count
FROM "Product"
WHERE name LIKE '%Demo%' OR name LIKE '%Test%';

-- 5. Sales with demo/test IDs
SELECT 'Sales with demo IDs:' as check_name, COUNT(*) as count
FROM "Sale"
WHERE "lightspeedId" LIKE '%demo%' OR "lightspeedId" LIKE '%test%'
   OR "lightspeedId" LIKE 'LS-SALE-%';

-- 6. Sale assignments with demo sale IDs
SELECT 'Sale assignments with demo IDs:' as check_name, COUNT(*) as count
FROM "SaleAssignment" 
WHERE "saleId" LIKE '%demo%' OR "saleId" LIKE '%test%' OR "saleId" LIKE 'LS-SALE-%';

-- 7. Alteration jobs with demo data
SELECT 'Alteration jobs with demo data:' as check_name, COUNT(*) as count
FROM "AlterationJob"
WHERE notes LIKE '%demo%' OR notes LIKE '%test%' OR notes LIKE 'Alteration % for party %';

-- 8. Appointments with demo data
SELECT 'Appointments with demo data:' as check_name, COUNT(*) as count
FROM "Appointment" 
WHERE notes LIKE '%demo%' OR notes LIKE '%test%';

-- 9. Party members with demo customer IDs
SELECT 'Party members with demo data:' as check_name, COUNT(*) as count
FROM "PartyMember" 
WHERE notes LIKE '%demo%' OR notes LIKE '%test%' OR notes LIKE 'Notes for member % of party %';

-- 10. Communication logs with demo data
SELECT 'Communication logs with demo data:' as check_name, COUNT(*) as count
FROM "CommunicationLog" 
WHERE message LIKE '%demo%' OR message LIKE '%test%';

-- 11. Audit logs with demo references
SELECT 'Audit logs with demo references:' as check_name, COUNT(*) as count
FROM "AuditLog" 
WHERE details LIKE '%demo%' OR details LIKE '%test%';

-- 12. Skills with demo names
SELECT 'Skills with demo names:' as check_name, COUNT(*) as count
FROM "Skill" 
WHERE name LIKE '%Demo%' OR name LIKE '%Test%';

-- 13. Check if Settings table exists and has demo values
SELECT 'Settings with demo values:' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Settings')
            THEN (SELECT COUNT(*) FROM "Settings" WHERE "key" LIKE '%demo%' OR "key" LIKE '%test%')
            ELSE 0
       END as count;

-- 14. Check for sequential/pattern-based fake IDs in key tables
SELECT 'Customers with sequential IDs (potential test data):' as check_name, COUNT(*) as count
FROM "Customer" 
WHERE phone LIKE '555-000%' OR phone LIKE '555-123%';

-- 15. Check alteration task types for demo data
SELECT 'Alteration task types with demo data:' as check_name, COUNT(*) as count
FROM "AlterationTaskType"
WHERE name LIKE '%Demo%' OR name LIKE '%Test%';

-- Show actual demo data samples for verification
SELECT '=== SAMPLE DEMO DATA FOUND ===' as separator;

-- Show demo users
SELECT 'Demo Users:' as type, id, email, name FROM "User" 
WHERE email LIKE '%@demo.com' OR email LIKE '%demo%' OR email LIKE '%test%'
LIMIT 5;

-- Show demo customers  
SELECT 'Demo Customers:' as type, id, email, name FROM "Customer" 
WHERE email LIKE '%@demo.com' OR email LIKE '%demo%' OR email LIKE '%test%' 
   OR name LIKE '%Demo%' OR name LIKE '%Test%' OR name LIKE 'Customer %'
LIMIT 5;

-- Show demo parties
SELECT 'Demo Parties:' as type, id, name, "eventDate" FROM "Party" 
WHERE name LIKE '%Demo%' OR name LIKE '%Test%' OR name LIKE 'Demo Wedding %'
LIMIT 5;

-- Show demo sale assignments
SELECT 'Demo Sale Assignments:' as type, id, "saleId", "associateId" FROM "SaleAssignment" 
WHERE "saleId" LIKE '%demo%' OR "saleId" LIKE '%test%' OR "saleId" LIKE 'LS-SALE-%'
LIMIT 5;

-- Show demo alteration jobs
SELECT 'Demo Alteration Jobs:' as type, id, "jobNumber", notes FROM "AlterationJob"
WHERE notes LIKE '%demo%' OR notes LIKE '%test%' OR notes LIKE 'Alteration % for party %'
LIMIT 5;

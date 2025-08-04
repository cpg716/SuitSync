# Alterations Workflow Quick Start Guide

## Overview

This guide will help you get started with the Alterations Workflow System quickly. You'll learn how to create alteration jobs, assign tailors, track work progress, and manage the complete workflow.

## Prerequisites

- Backend server running on `http://localhost:3000`
- Authentication token for API access
- At least one tailor user in the system

## Quick Start Steps

### 1. Create an Alteration Job

```bash
curl -X POST http://localhost:3000/api/alterations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{
    "customerId": 1,
    "orderStatus": "ALTERATION_ONLY",
    "dueDate": "2024-12-08",
    "rushOrder": false,
    "notes": "Wedding suit alterations",
    "jobParts": [
      {
        "partName": "Navy Suit Jacket",
        "partType": "JACKET",
        "priority": "HIGH",
        "estimatedTime": 120,
        "tasks": [
          {
            "taskName": "Shorten Sleeves",
            "taskType": "alteration",
            "measurements": "1.5 inches"
          },
          {
            "taskName": "Button Replacement",
            "taskType": "button_work"
          }
        ]
      },
      {
        "partName": "Navy Suit Pants",
        "partType": "PANTS",
        "priority": "HIGH",
        "estimatedTime": 90,
        "tasks": [
          {
            "taskName": "Hem",
            "taskType": "alteration",
            "measurements": "32 inch inseam"
          }
        ]
      }
    ]
  }'
```

### 2. Get Available Tailors

```bash
curl -X GET "http://localhost:3000/api/alterations/available-tailors?taskType=alteration" \
  -H "Authorization: Bearer <your_token>"
```

### 3. Assign Tailor to Job Part

```bash
curl -X POST http://localhost:3000/api/alterations/parts/1/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{
    "tailorId": 5,
    "reason": "Wedding priority assignment"
  }'
```

### 4. Start Work on a Task

```bash
curl -X POST http://localhost:3000/api/alterations/tasks/1/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{
    "tailorId": 5,
    "notes": "Starting sleeve shortening"
  }'
```

### 5. Finish Work on a Task

```bash
curl -X POST http://localhost:3000/api/alterations/tasks/1/finish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{
    "timeSpent": 45,
    "notes": "Sleeves shortened successfully",
    "initials": "MJ"
  }'
```

### 6. Get Job History

```bash
curl -X GET http://localhost:3000/api/alterations/jobs/1/history \
  -H "Authorization: Bearer <your_token>"
```

## Using the Test Script

For a complete demonstration, run the test script:

```bash
cd backend
node test-tailor-workflow.js
```

This script will:
1. Create a complete alteration job
2. Find available tailors
3. Assign a tailor to a job part
4. Start and finish work on tasks
5. Retrieve complete job history

## Key Concepts

### Job Structure
- **AlterationJob**: Main container for the entire alteration job
- **AlterationJobPart**: Individual garment parts (jacket, pants, etc.)
- **AlterationTask**: Specific tasks within each part (hem, buttons, etc.)

### Workflow States
```
NOT_STARTED → IN_PROGRESS → COMPLETE → PICKED_UP
```

### Task Types
- **ALTERATION**: Standard alterations (hem, take in, etc.)
- **BUTTON_WORK**: Button replacement, hook & eye, etc.
- **MEASUREMENT**: Taking or updating measurements
- **CUSTOM**: Custom tasks not in standard categories

### Garment Types
- **JACKET**: Suit jackets, blazers, etc.
- **PANTS**: Trousers, slacks, etc.
- **VEST**: Waistcoats, vests, etc.
- **SHIRT**: Dress shirts, casual shirts, etc.
- **DRESS**: Dresses, gowns, etc.
- **SKIRT**: Skirts, etc.
- **OTHER**: Other garment types

## Common Workflows

### Wedding Suit Alterations
1. Create job with multiple parts (jacket, pants, vest)
2. Assign high priority
3. Assign specialized tailors for each part
4. Track progress through fittings
5. Complete all tasks before wedding date

### Rush Order Processing
1. Create job with rush priority
2. Assign to available tailors immediately
3. Monitor progress closely
4. Complete within tight deadline

### Quality Control
1. Review completed tasks
2. Verify measurements and specifications
3. Final inspection before pickup
4. Mark job as complete

## Troubleshooting

### Common Issues

#### Authentication Errors
- Ensure you have a valid JWT token
- Check token expiration
- Verify user has appropriate permissions

#### Assignment Errors
- Verify tailor exists and is active
- Check tailor has required abilities
- Ensure tailor is available for assignment

#### Status Update Errors
- Verify task exists and is in correct state
- Check tailor is assigned to task
- Ensure all required fields are provided

### Getting Help

- Check the [full documentation](ALTERATIONS_WORKFLOW.md)
- Review the [API reference](ALTERATIONS_API_REFERENCE.md)
- Run test scripts to verify functionality
- Check server logs for detailed error messages

## Next Steps

1. **Explore the UI**: Use the frontend interface for visual management
2. **Set up QR Codes**: Implement QR code scanning for easy task management
3. **Configure Printing**: Set up thermal printer integration
4. **Calendar Integration**: Prepare for future calendar scheduling features
5. **Analytics**: Review performance metrics and optimization opportunities

## Support

For additional support:
- Review the comprehensive [Alterations Workflow Documentation](ALTERATIONS_WORKFLOW.md)
- Check the [API Reference](ALTERATIONS_API_REFERENCE.md) for detailed endpoint information
- Run test scripts to verify your setup
- Check server logs for debugging information 
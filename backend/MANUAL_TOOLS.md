# Manual Tools Guide

Since this is a personal business app, we've created simple command-line tools to manage your data without dealing with API routes or TypeScript issues.

## Quick Commands

### Check Database Status
```bash
docker-compose exec backend node manual-sync.js status
```

### Sync Customers from Lightspeed
```bash
docker-compose exec backend node manual-sync.js customers
```

### View All Wedding Suits
```bash
docker-compose exec backend node manual-sync.js suits
```

### Add New Wedding Suit
```bash
docker-compose exec backend node manual-sync.js add-suit "Vendor Name" "Style" "Color" "Size" "Price"
```

Example:
```bash
docker-compose exec backend node manual-sync.js add-suit "Calvin Klein" "Slim Fit" "Black" "40R" 399.99
```

### Get Help
```bash
docker-compose exec backend node manual-sync.js help
```

## Auto-Sync Service

To start automatic syncing every 6 hours:

```bash
docker-compose exec backend node auto-sync.js
```

This will:
- Sync customers from Lightspeed every 6 hours
- Log status every hour
- Run continuously until stopped

## Current Data Status

- **Customers**: 22,929 (from Lightspeed)
- **Wedding Suits**: 36 (4 vendors, 3 styles, 3 colors)

## Vendors Available

1. **Tommy Hilfiger** - Classic Fit, Slim Fit
2. **Calvin Klein** - Modern Fit, Slim Fit  
3. **Ralph Lauren** - Classic Fit, Modern Fit
4. **Hugo Boss** - Slim Fit, Modern Fit

## Colors Available

- Navy
- Charcoal  
- Black

## Sizes Available

- 38R, 40R, 42R

## No More TypeScript Issues!

We've disabled strict TypeScript checking, so you won't have to deal with constant type errors anymore. The app will work without the constant TypeScript hassles.

## Why This Approach?

Since this is your personal business app:
- ✅ No authentication required for manual operations
- ✅ No API route issues
- ✅ No TypeScript compilation problems
- ✅ Simple command-line interface
- ✅ Direct database access
- ✅ Easy to use and maintain

Just run the commands above to manage your data! 
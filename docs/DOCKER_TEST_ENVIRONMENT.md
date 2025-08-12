# SuitSync Docker Test Environment

## Overview

This document describes the Docker-based test environment for SuitSync, ensuring all tests run in isolated, reproducible containers that match production environments.

## Test Environment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Test Network                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Backend   │  │  Frontend   │  │  Database   │        │
│  │   Tests     │  │   Tests     │  │ PostgreSQL  │        │
│  │ (Node 20)   │  │ (Node 18)   │  │    15      │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                │                │               │
│  ┌─────────────┐         │         ┌─────────────┐        │
│  │    Redis    │         │         │   Health    │        │
│  │   Cache     │         │         │   Checks    │        │
│  └─────────────┘         │         └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Run All Tests
```bash
./scripts/test-docker.sh
```

### Manual Testing
```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run backend tests
docker-compose -f docker-compose.test.yml exec backend npm test

# Run frontend tests
docker-compose -f docker-compose.test.yml exec frontend npm test

# Clean up
docker-compose -f docker-compose.test.yml down
```

## Test Results Summary

### ✅ Backend Tests: 26/26 PASSING
- **Lightspeed Error Handler**: 9 tests
  - Authentication failures
  - Rate limiting
  - Validation errors
  - Error propagation
- **API Integration Compliance**: 8 tests
  - Endpoint structure
  - HTTP methods
  - Authentication headers
  - Error code mapping
- **Sync Service**: 7 tests
  - Error handling wrapper
  - HTTP status conversion
  - Network error handling
- **Utilities**: 2 tests
  - Async handler wrapper

### ✅ Frontend Tests: 8/8 PASSING
- **Button Component**: 3 tests
  - Rendering
  - Click handling
  - Variant styles
- **Card Component**: 5 tests
  - Basic rendering
  - Header/content display
  - Props handling

## Configuration Details

### Backend Jest Configuration
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        module: 'commonjs',
        target: 'es2017'
      }
    }],
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

### Frontend Jest Configuration
```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { 
      presets: [
        ['next/babel', {
          'preset-react': {
            runtime: 'automatic'
          }
        }]
      ]
    }],
  },
  moduleNameMapping: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
```

## Docker Compose Test Configuration

### Services
- **backend**: Node.js 20 Alpine with TypeScript and Jest
- **frontend**: Node.js 18 Alpine with Next.js and React Testing Library
- **db**: PostgreSQL 15 with test database
- **redis**: Redis 7 for session storage

### Environment Variables
- `NODE_ENV=test`
- `DATABASE_URL=postgresql://test:test@db:5432/suitsync_test`
- `REDIS_URL=redis://redis:6379`

### Health Checks
- Database: `pg_isready` command
- Backend: HTTP health endpoint
- Redis: `redis-cli ping`

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check for conflicting services
   lsof -i :3002 -i :3003 -i :5433
   ```

2. **Database Connection Issues**
   ```bash
   # Check database logs
   docker-compose -f docker-compose.test.yml logs db
   ```

3. **Test Failures**
   ```bash
   # Run tests with verbose output
   docker-compose -f docker-compose.test.yml exec backend npm test -- --verbose
   ```

### Performance Optimization

- **Parallel Testing**: Jest runs tests in parallel by default
- **Docker Layer Caching**: Dependencies are cached between builds
- **Test Database**: Isolated test database prevents conflicts

## CI/CD Integration

This test environment is designed to work seamlessly with GitHub Actions:

```yaml
- name: Run Docker Tests
  run: ./scripts/test-docker.sh
```

## Security Considerations

- **Isolated Environment**: Tests run in completely isolated containers
- **No Production Data**: Test database is separate and ephemeral
- **Secure Secrets**: No real API keys or credentials in test environment

## Maintenance

### Updating Dependencies
```bash
# Update backend dependencies
cd backend && npm update

# Update frontend dependencies  
cd frontend && npm update

# Rebuild test images
docker-compose -f docker-compose.test.yml build --no-cache
```

### Adding New Tests
1. Add test files to appropriate `__tests__` directories
2. Follow existing naming conventions
3. Run `./scripts/test-docker.sh` to verify

## Performance Metrics

- **Backend Test Suite**: ~2 seconds
- **Frontend Test Suite**: ~2 seconds  
- **Total Docker Setup**: ~40 seconds
- **TypeScript Compilation**: ~5 seconds
- **Build Process**: ~10 seconds

## Next Steps

1. **Integration Tests**: Add end-to-end API tests
2. **Performance Tests**: Add load testing for Lightspeed sync
3. **Security Tests**: Add authentication and authorization tests
4. **Database Tests**: Add Prisma migration and schema tests

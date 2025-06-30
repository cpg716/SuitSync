# SuitSync Developer Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Development Workflow](#development-workflow)
4. [Testing Strategy](#testing-strategy)
5. [Performance Optimization](#performance-optimization)
6. [Security Best Practices](#security-best-practices)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- PostgreSQL 15+
- Docker and Docker Compose
- Git
- Lightspeed X-Series developer account

### Quick Setup

1. **Clone and Install**
   ```bash
   git clone https://github.com/your-org/suitsync.git
   cd suitsync
   pnpm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**
   ```bash
   # Using Docker
   docker-compose up -d postgres
   
   # Or local PostgreSQL
   createdb suitsync
   ```

4. **Run Migrations**
   ```bash
   cd backend
   npx prisma migrate deploy
   npx prisma db seed
   ```

5. **Start Development**
   ```bash
   # Terminal 1: Backend
   cd backend && pnpm dev
   
   # Terminal 2: Frontend
   cd frontend && pnpm dev
   ```

## Architecture Overview

### Backend Architecture

```
backend/
├── src/
│   ├── controllers/          # Request handlers
│   ├── middleware/           # Express middleware
│   ├── routes/              # API route definitions
│   ├── services/            # Business logic
│   ├── utils/               # Utility functions
│   ├── types/               # TypeScript types
│   └── __tests__/           # Test files
├── prisma/                  # Database schema & migrations
└── dist/                    # Compiled JavaScript
```

**Key Components:**

- **Controllers**: Handle HTTP requests/responses
- **Services**: Business logic and external API integration
- **Middleware**: Authentication, validation, logging, security
- **Prisma**: Database ORM with type safety
- **Lightspeed Client**: Centralized API client with retry logic

### Frontend Architecture

```
frontend/
├── pages/                   # Next.js pages (routing)
├── components/              # Reusable UI components
├── contexts/                # React contexts (state management)
├── lib/                     # Utility functions
├── styles/                  # Global styles
└── __tests__/               # Test files
```

**Key Technologies:**

- **Next.js**: React framework with SSR/SSG
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Component library
- **SWR**: Data fetching and caching
- **React Hook Form**: Form management

### Database Design

The database follows a normalized design with proper indexing:

- **Customers**: Core customer data synced with Lightspeed
- **Parties**: Wedding/event groups linked to customers
- **AlterationJobs**: Work orders with QR tracking
- **Appointments**: Scheduling system
- **Users**: Staff management with role-based access

## Development Workflow

### Code Style and Standards

1. **TypeScript**: Strict mode enabled
2. **ESLint**: Configured for both backend and frontend
3. **Prettier**: Code formatting (run on save)
4. **Husky**: Pre-commit hooks for linting and testing

### Git Workflow

```bash
# Feature development
git checkout -b feature/new-feature
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Create PR, get review, merge to main
```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Build process or auxiliary tool changes

### API Development

1. **Define Schema**: Update Prisma schema if needed
2. **Create Migration**: `npx prisma migrate dev`
3. **Add Validation**: Use Zod schemas in middleware
4. **Implement Controller**: Handle business logic
5. **Add Routes**: Register in route files
6. **Write Tests**: Unit and integration tests
7. **Update Documentation**: API reference and examples

### Frontend Development

1. **Design Components**: Start with shadcn/ui primitives
2. **Implement Logic**: Use React hooks and contexts
3. **Add Data Fetching**: Use SWR for API calls
4. **Style Components**: Tailwind CSS classes
5. **Add Tests**: Component and integration tests
6. **Accessibility**: Ensure ARIA compliance

## Testing Strategy

### Backend Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

**Test Types:**

1. **Unit Tests**: Individual functions and methods
2. **Integration Tests**: API endpoints with database
3. **Service Tests**: External API integrations

**Test Structure:**
```typescript
describe('CustomerController', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  it('should create customer successfully', async () => {
    const response = await request(app)
      .post('/api/customers')
      .send(validCustomerData)
      .expect(201);
    
    expect(response.body).toMatchObject({
      name: validCustomerData.name,
      email: validCustomerData.email,
    });
  });
});
```

### Frontend Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage
```

**Test Types:**

1. **Component Tests**: React Testing Library
2. **Hook Tests**: Custom hook testing
3. **Integration Tests**: User workflows

**Test Example:**
```typescript
import { render, screen, fireEvent } from '../utils/testUtils';
import CustomerCard from '../components/CustomerCard';

test('renders customer information', () => {
  const customer = createMockCustomer();
  render(<CustomerCard customer={customer} />);
  
  expect(screen.getByText(customer.name)).toBeInTheDocument();
  expect(screen.getByText(customer.email)).toBeInTheDocument();
});
```

## Performance Optimization

### Database Optimization

1. **Indexing Strategy**:
   ```sql
   -- Composite indexes for common queries
   CREATE INDEX idx_jobs_status_due_date ON alteration_jobs(status, due_date);
   CREATE INDEX idx_appointments_date_tailor ON appointments(date_time, tailor_id);
   ```

2. **Query Optimization**:
   ```typescript
   // Use select to limit fields
   const customers = await prisma.customer.findMany({
     select: {
       id: true,
       name: true,
       email: true,
     },
     take: 50, // Limit results
   });
   ```

3. **Connection Pooling**: Prisma handles this automatically

### Caching Strategy

```typescript
import { cacheService, CACHE_TTL } from '../services/cacheService';

// Cache expensive operations
const customers = await cacheService.cached(
  'customers:all',
  () => performanceService.getCustomersOptimized(filters),
  CACHE_TTL.MEDIUM
);
```

### Frontend Optimization

1. **SWR Configuration**:
   ```typescript
   const { data, error } = useSWR('/api/customers', fetcher, {
     revalidateOnFocus: false,
     dedupingInterval: 60000, // 1 minute
   });
   ```

2. **Code Splitting**: Next.js handles this automatically
3. **Image Optimization**: Use Next.js Image component
4. **Bundle Analysis**: `pnpm analyze`

## Security Best Practices

### Authentication & Authorization

1. **JWT Tokens**: HTTP-only cookies for web, Bearer tokens for API
2. **Role-Based Access**: Admin, Manager, Tailor, Sales roles
3. **Session Management**: Secure session storage with Prisma

### Input Validation

```typescript
import { validateBody, customerSchemas } from '../middleware/validation';

router.post('/customers', 
  validateBody(customerSchemas.create),
  createCustomer
);
```

### Security Headers

```typescript
// Configured in middleware/security.ts
app.use(securityHeaders); // Helmet with CSP
app.use(rateLimits.general); // Rate limiting
app.use(sanitizeInput); // Input sanitization
```

### Data Protection

1. **Encryption**: Sensitive data encrypted at rest
2. **Audit Logging**: All actions logged with user context
3. **HTTPS Only**: Force secure connections in production
4. **CORS**: Strict origin validation

## Deployment

### Docker Deployment

```bash
# Build images
docker-compose build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables

```bash
# Production environment
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
SESSION_SECRET=your-secret-key
LIGHTSPEED_CLIENT_ID=your-client-id
LIGHTSPEED_CLIENT_SECRET=your-client-secret
```

### CI/CD Pipeline

GitHub Actions workflow:

1. **Lint & Test**: ESLint, TypeScript, Jest
2. **Build**: Docker images
3. **Deploy**: To staging/production
4. **Health Check**: Verify deployment

### Monitoring

1. **Performance Metrics**: `/api/performance/metrics`
2. **Health Checks**: `/api/performance/health`
3. **Error Tracking**: Structured logging
4. **Database Monitoring**: Query performance tracking

## Troubleshooting

### Common Issues

1. **Database Connection**:
   ```bash
   # Check PostgreSQL status
   pg_isready -h localhost -p 5432
   
   # Reset database
   npx prisma migrate reset
   ```

2. **Lightspeed API Errors**:
   ```bash
   # Check API health
   curl -X GET /api/lightspeed/health
   
   # Refresh tokens
   # Re-authenticate through /api/auth/start-lightspeed
   ```

3. **Cache Issues**:
   ```bash
   # Clear cache
   curl -X POST /api/performance/cache/clear
   ```

### Debug Mode

```bash
# Enable debug logging
DEBUG=suitsync:* pnpm dev

# Database query logging
DATABASE_LOGGING=true pnpm dev
```

### Performance Issues

1. **Slow Queries**: Check `/api/performance/queries/slow`
2. **Memory Usage**: Monitor `/api/performance/health`
3. **Cache Hit Rate**: Check `/api/performance/cache/stats`

### Getting Help

1. **Documentation**: Check docs/ directory
2. **API Reference**: docs/API_REFERENCE.md
3. **Issues**: GitHub Issues for bug reports
4. **Discussions**: GitHub Discussions for questions

# SuitSync Developer Guide

## Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm
- Docker & Docker Compose
- PostgreSQL

### Setup
```bash
# Clone and install dependencies
git clone <repository>
cd suitsync_full_clean
pnpm install

# Start all services
docker-compose up -d

# Run database migrations
cd backend && pnpm prisma migrate deploy

# Start development servers
pnpm dev  # Starts both frontend and backend
```

## Testing

### Frontend Tests
```bash
cd frontend
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

**Current Test Coverage:**
- ✅ Button component (5 tests)
- ✅ Card component (3 tests)
- ✅ Jest DOM matchers configured
- ✅ TypeScript declarations working

### Backend Tests
```bash
cd backend
npm test              # Run all tests
npm run test:watch    # Watch mode
```

**Current Test Coverage:**
- ✅ Utility functions (asyncHandler)
- ✅ Error handling middleware
- ✅ Clean test execution without database dependencies

### Type Checking
```bash
# Frontend
cd frontend && npm run type-check

# Backend  
cd backend && npm run type-check
```

## Development Workflow

### Code Quality
- **TypeScript**: Strict mode enabled, no type errors allowed
- **ESLint**: Configured for both frontend and backend
- **Prettier**: Automatic code formatting
- **Tests**: Must pass before merge

### Database
- **Prisma**: ORM with migrations
- **PostgreSQL**: Production database
- **Migrations**: Run with `pnpm prisma migrate deploy`

### API Development
- **Express**: Backend framework
- **REST**: Standard RESTful endpoints
- **Validation**: Request/response validation
- **Error Handling**: Consistent error responses

### Frontend Development
- **Next.js**: React framework
- **Tailwind CSS**: Styling
- **shadcn/ui**: Component library
- **SWR**: Data fetching
- **TypeScript**: Full type safety

## Deployment

### Docker
```bash
# Build and run
docker-compose up --build

# Production build
docker-compose -f docker-compose.prod.yml up --build
```

### Environment Variables
Required environment variables are documented in `.env.example` files.

## Troubleshooting

### Common Issues
1. **Database connection**: Ensure PostgreSQL is running
2. **Port conflicts**: Check if ports 3000/3001 are available
3. **Type errors**: Run `npm run type-check` to identify issues
4. **Test failures**: Check Jest configuration and dependencies

### Getting Help
- Check existing documentation in `/docs`
- Review error logs in Docker containers
- Ensure all dependencies are installed

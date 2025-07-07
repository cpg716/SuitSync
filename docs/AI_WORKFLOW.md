# AI-Augmented Development Workflow for SuitSync

This guide provides best practices for using AI tools (Cursor, GitHub Copilot, ChatGPT, Claude, etc.) to effectively develop, debug, and maintain SuitSync.

## Overview

SuitSync is designed to be AI-friendly with clear patterns, comprehensive documentation, and modular architecture. This guide helps you leverage AI tools for maximum productivity while maintaining code quality.

## AI Tool Setup

### Recommended AI Tools
- **Cursor**: Primary IDE with built-in AI assistance
- **GitHub Copilot**: Code completion and suggestions
- **ChatGPT/Claude**: Complex problem solving and architecture discussions
- **Augment AI**: Codebase-aware assistance (if available)

### Context Preparation
Before working with AI tools, ensure you have:
1. **Project Overview**: Share the main README.md for context
2. **Specific Documentation**: Reference relevant guides (API_DOCUMENTATION.md, LIGHTSPEED_INTEGRATION_GUIDE.md)
3. **Current Task**: Clearly define what you're trying to accomplish

## Effective AI Prompting Strategies

### 1. Code Review and Refactoring
```
"Review this SuitSync backend controller for:
- Lightspeed API error handling
- Data validation and security
- TypeScript best practices
- Integration with Prisma ORM

[paste code here]"
```

### 2. Lightspeed Integration
```
"Help me implement a new Lightspeed API endpoint for SuitSync that:
- Handles OAuth token refresh automatically
- Implements proper pagination
- Maps Lightspeed data to our Prisma schema
- Includes comprehensive error handling

Context: We use the lightspeedClient.ts pattern with automatic token refresh."
```

### 3. Frontend Component Development
```
"Create a React component for SuitSync that:
- Uses our existing Tailwind CSS patterns
- Integrates with our AuthContext
- Handles loading states with our toast system
- Follows our shadcn/ui component patterns

Reference: [paste existing similar component]"
```

### 4. Database and Sync Operations
```
"Review this sync service function for:
- Proper error handling and rollback
- BigInt version tracking
- Prisma transaction safety
- Lightspeed API rate limiting

Context: This syncs customer data from Lightspeed to our local database."
```

## Common AI Workflows

### Backend Development

#### 1. API Endpoint Creation
1. **Prompt**: "Create a new API endpoint following SuitSync patterns"
2. **Provide**: Existing controller example, route structure, auth middleware
3. **Review**: Error handling, validation, Lightspeed integration
4. **Test**: Generate test cases with AI assistance

#### 2. Lightspeed Integration
1. **Prompt**: "Implement Lightspeed API call with our client pattern"
2. **Provide**: lightspeedClient.ts, existing API calls, error patterns
3. **Review**: Token refresh, pagination, data mapping
4. **Validate**: Test with actual Lightspeed API

#### 3. Database Operations
1. **Prompt**: "Create Prisma operations following our patterns"
2. **Provide**: schema.prisma, existing model operations
3. **Review**: Transactions, error handling, data integrity
4. **Test**: Generate seed data and test scenarios

### Frontend Development

#### 1. Component Creation
1. **Prompt**: "Create React component using our design system"
2. **Provide**: Existing components, Tailwind patterns, shadcn/ui usage
3. **Review**: Accessibility, responsive design, error states
4. **Test**: Generate test cases and stories

#### 2. API Integration
1. **Prompt**: "Integrate with backend API using our patterns"
2. **Provide**: apiClient.ts, existing API calls, error handling
3. **Review**: Loading states, error boundaries, data validation
4. **Test**: Mock API responses and error scenarios

### Testing and Quality Assurance

#### 1. Test Generation
```
"Generate comprehensive tests for this SuitSync function:
- Unit tests for business logic
- Integration tests for API endpoints
- Error scenario testing
- Mock Lightspeed API responses

[paste function here]"
```

#### 2. Code Quality Review
```
"Review this SuitSync code for:
- TypeScript strict mode compliance
- Security vulnerabilities
- Performance optimizations
- Maintainability improvements

Focus on our Lightspeed integration patterns."
```

## Project-Specific AI Prompts

### Lightspeed Integration Audit
```
"Search the SuitSync codebase for all instances of:
- customer sync operations
- party/group management
- sale and commission tracking
- alteration workflow

Identify any inconsistencies or missing error handling."
```

### Architecture Review
```
"Review the SuitSync architecture for:
- Separation of concerns
- Error handling patterns
- Data flow consistency
- Security best practices

Focus on the backend/frontend API boundary."
```

### Performance Optimization
```
"Analyze SuitSync for performance improvements:
- Database query optimization
- API call efficiency
- Frontend bundle size
- Caching opportunities

Consider our Lightspeed sync requirements."
```

## Best Practices

### Do's
- ✅ Provide specific context about SuitSync patterns
- ✅ Reference existing code examples
- ✅ Ask for explanations of suggested changes
- ✅ Request test cases for new functionality
- ✅ Validate AI suggestions against our documentation

### Don'ts
- ❌ Accept AI suggestions without understanding them
- ❌ Skip testing AI-generated code
- ❌ Ignore our established patterns and conventions
- ❌ Forget to consider Lightspeed API limitations
- ❌ Overlook security implications

## Troubleshooting with AI

### Common Issues and Prompts

**Lightspeed API Errors**
```
"Help debug this Lightspeed API error in SuitSync:
[error message]

Context: Using our lightspeedClient.ts with OAuth token refresh.
What could be causing this and how should I fix it?"
```

**Database Sync Issues**
```
"SuitSync sync service is failing with this error:
[error message]

Context: Syncing customers from Lightspeed to Prisma database.
Review our sync patterns and suggest fixes."
```

**Frontend State Management**
```
"React component state is not updating correctly:
[describe issue]

Context: Using SWR for data fetching and our AuthContext.
What's the best approach following our patterns?"
```

## Continuous Learning

### Stay Updated
- Review AI-suggested improvements regularly
- Ask AI to explain new patterns or technologies
- Use AI to generate documentation for new features
- Request code reviews from AI for learning

### Knowledge Sharing
- Document AI-discovered patterns
- Share effective prompts with the team
- Create templates for common AI workflows
- Build a knowledge base of AI-assisted solutions

## Integration with Development Tools

### VS Code/Cursor
- Use AI for inline code completion
- Generate JSDoc comments automatically
- Refactor code with AI assistance
- Create snippets from AI suggestions

### Git Workflow
- Generate commit messages with AI
- Create PR descriptions using AI
- Use AI for code review comments
- Generate release notes automatically

For more information on SuitSync development, see the main [README.md](../README.md) and other documentation files.

## Sync & Health
- Sync status is always up to date and visible in the header.
- All resources are tracked; errors and API health are surfaced in the UI and logs.

## Troubleshooting
- If sync status is 'Idle' or missing, check the SyncStatus table and backend logs.
- For Windows migration, see `DEPLOYMENT_GUIDE.md`.

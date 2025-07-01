# SuitSync Deployment Guide v2.0

## Quick Start (Docker)

### Prerequisites
- Docker & Docker Compose
- Lightspeed X-Series API credentials
- PostgreSQL database (or use included Docker setup)

### 1. Clone and Setup
```bash
git clone https://github.com/your-org/suitsync_full.git
cd suitsync_full
cp .env.example .env
```

### 2. Configure Environment
Edit `.env` with your credentials:
```bash
# Required - Lightspeed X-Series
LS_CLIENT_ID=your_client_id
LS_CLIENT_SECRET=your_client_secret  
LS_ACCOUNT_ID=your_account_id
LS_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Required - Database
DATABASE_URL="postgresql://postgres:postgres@db:5432/suitsync_prod"

# Required - Security
SESSION_SECRET=your-32-character-secret
JWT_SECRET=your-32-character-secret
```

### 3. Deploy
```bash
# Development
docker-compose -f docker-compose.dev.yml up --build

# Production
docker-compose up --build -d
```

### 4. Access
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health

## Production Deployment

### Environment Variables
```bash
NODE_ENV=production
DATABASE_URL=your_production_db_url
FRONTEND_URL=https://your-domain.com
SESSION_SECRET=secure-32-char-secret
JWT_SECRET=secure-32-char-secret
LS_CLIENT_ID=your_lightspeed_client_id
LS_CLIENT_SECRET=your_lightspeed_client_secret
LS_ACCOUNT_ID=your_lightspeed_account_id
LS_REDIRECT_URI=https://your-domain.com/api/auth/callback
```

### SSL/HTTPS Setup
Update `docker-compose.yml` with SSL certificates:
```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl
      - ./nginx.conf:/etc/nginx/nginx.conf
```

### Health Monitoring
- **Health Endpoint**: `/api/health`
- **Metrics**: `/api/performance/metrics` (admin only)
- **Logs**: `docker-compose logs -f backend`

## Troubleshooting

### Common Issues
1. **401 Errors**: Check Lightspeed credentials and account ID
2. **431 Header Size**: Session cleanup is automatic (v2.0 fix)
3. **Database Connection**: Ensure DATABASE_URL uses correct host (`db` for Docker)
4. **OAuth Redirect**: Verify LS_REDIRECT_URI matches exactly

### Debug Commands
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs backend
docker-compose logs frontend

# Database access
docker-compose exec db psql -U postgres -d suitsync_prod

# Restart services
docker-compose restart backend frontend
```

## Security Checklist
- [ ] Use strong SESSION_SECRET and JWT_SECRET (32+ characters)
- [ ] Enable HTTPS in production
- [ ] Configure firewall rules
- [ ] Regular database backups
- [ ] Monitor error logs
- [ ] Update dependencies regularly
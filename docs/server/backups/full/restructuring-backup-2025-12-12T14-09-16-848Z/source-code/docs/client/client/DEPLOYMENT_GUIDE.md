# Frontend Deployment Guide

This guide covers deploying the HR-App and Platform-Admin applications in various environments.

## Quick Start

### Development
```bash
cd client
npm run dev
```

### Production Build
```bash
cd client
npm run build:production
```

## Deployment Scenarios

### 1. Single Server Deployment (Recommended for On-Premise)

Deploy both applications on the same server with different paths.

**Step 1: Build Applications**
```bash
cd client
npm run build:production
```

**Step 2: Configure Web Server**

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # HR-App (Tenant Application)
    location /hr-app/ {
        alias /var/www/hrms/client/hr-app/build/;
        try_files $uri $uri/ /hr-app/index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Platform-Admin Application
    location /platform-admin/ {
        alias /var/www/hrms/client/platform-admin/build/;
        try_files $uri $uri/ /platform-admin/index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Redirect root to HR-App
    location = / {
        return 301 /hr-app/;
    }
}
```

#### Apache Configuration
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /var/www/hrms

    # HR-App
    Alias /hr-app /var/www/hrms/client/hr-app/build
    <Directory /var/www/hrms/client/hr-app/build>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Enable client-side routing
        RewriteEngine On
        RewriteBase /hr-app/
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /hr-app/index.html [L]
    </Directory>

    # Platform-Admin
    Alias /platform-admin /var/www/hrms/client/platform-admin/build
    <Directory /var/www/hrms/client/platform-admin/build>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Enable client-side routing
        RewriteEngine On
        RewriteBase /platform-admin/
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /platform-admin/index.html [L]
    </Directory>

    # Backend API Proxy
    ProxyPass /api/ http://localhost:5000/api/
    ProxyPassReverse /api/ http://localhost:5000/api/
</VirtualHost>
```

### 2. Separate Domain Deployment (Recommended for SaaS)

Deploy each application on its own subdomain.

**DNS Configuration:**
- `app.your-domain.com` → HR-App
- `admin.your-domain.com` → Platform-Admin
- `api.your-domain.com` → Backend API

**Step 1: Update Environment Variables**

`hr-app/.env.production`:
```
REACT_APP_API_URL=https://api.your-domain.com/api
REACT_APP_ENV=production
REACT_APP_VERSION=1.0.0
```

`platform-admin/.env.production`:
```
REACT_APP_API_URL=https://api.your-domain.com/api/platform
REACT_APP_ENV=production
REACT_APP_VERSION=1.0.0
```

**Step 2: Build with Production Environment**
```bash
cd client/hr-app
REACT_APP_API_URL=https://api.your-domain.com/api npm run build

cd ../platform-admin
REACT_APP_API_URL=https://api.your-domain.com/api/platform npm run build
```

**Step 3: Configure Web Server**

#### Nginx Configuration
```nginx
# HR-App
server {
    listen 80;
    server_name app.your-domain.com;
    root /var/www/hrms/client/hr-app/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Platform-Admin
server {
    listen 80;
    server_name admin.your-domain.com;
    root /var/www/hrms/client/platform-admin/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Backend API
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. CDN Deployment

Deploy static assets to a CDN for better performance.

**Step 1: Build with CDN URL**
```bash
# Update package.json or use environment variable
PUBLIC_URL=https://cdn.your-domain.com/hr-app npm run build:hr
PUBLIC_URL=https://cdn.your-domain.com/platform-admin npm run build:platform
```

**Step 2: Upload to CDN**
```bash
# Example: AWS S3 + CloudFront
aws s3 sync client/hr-app/build/ s3://your-bucket/hr-app/ --delete
aws s3 sync client/platform-admin/build/ s3://your-bucket/platform-admin/ --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### 4. Docker Deployment

**Dockerfile for HR-App:**
```dockerfile
# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY client/hr-app/package*.json ./
RUN npm ci
COPY client/hr-app/ ./
COPY client/shared/ ../shared/
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html/hr-app
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Dockerfile for Platform-Admin:**
```dockerfile
# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY client/platform-admin/package*.json ./
RUN npm ci
COPY client/platform-admin/ ./
COPY client/shared/ ../shared/
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html/platform-admin
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Docker Compose:**
```yaml
version: '3.8'

services:
  hr-app:
    build:
      context: .
      dockerfile: client/hr-app/Dockerfile
    ports:
      - "3000:80"
    environment:
      - REACT_APP_API_URL=http://localhost:5000/api

  platform-admin:
    build:
      context: .
      dockerfile: client/platform-admin/Dockerfile
    ports:
      - "3001:80"
    environment:
      - REACT_APP_API_URL=http://localhost:5000/api/platform

  backend:
    build: ./server
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
```

## Environment-Specific Builds

### Development
```bash
npm run start:both
```

### Staging
```bash
REACT_APP_ENV=staging npm run build:all
```

### Production
```bash
NODE_ENV=production npm run build:production
```

## SSL/TLS Configuration

### Let's Encrypt with Certbot

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d app.your-domain.com
sudo certbot --nginx -d admin.your-domain.com
sudo certbot --nginx -d api.your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Nginx SSL Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name app.your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/app.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.your-domain.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # ... rest of configuration
}
```

## Performance Optimization

### 1. Enable Gzip Compression

**Nginx:**
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
```

### 2. Browser Caching

Already configured in the nginx examples above with:
```nginx
expires 1y;
add_header Cache-Control "public, immutable";
```

### 3. HTTP/2

Enable HTTP/2 in nginx:
```nginx
listen 443 ssl http2;
```

## Monitoring and Logging

### Nginx Access Logs
```nginx
access_log /var/log/nginx/hr-app-access.log;
error_log /var/log/nginx/hr-app-error.log;
```

### Application Monitoring

Consider integrating:
- Google Analytics
- Sentry for error tracking
- LogRocket for session replay

## Rollback Strategy

### 1. Keep Previous Builds
```bash
# Before deploying
cp -r client/hr-app/build client/hr-app/build.backup
cp -r client/platform-admin/build client/platform-admin/build.backup

# Rollback if needed
rm -rf client/hr-app/build
mv client/hr-app/build.backup client/hr-app/build
```

### 2. Use Symlinks
```bash
# Create versioned builds
npm run build:production
mv client/hr-app/build client/hr-app/build-v1.2.3
ln -s client/hr-app/build-v1.2.3 client/hr-app/build

# Rollback
rm client/hr-app/build
ln -s client/hr-app/build-v1.2.2 client/hr-app/build
```

## Health Checks

### Nginx Health Check
```nginx
location /health {
    access_log off;
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}
```

### Application Health Check
Add a health check endpoint in your React apps that verifies:
- API connectivity
- Authentication service
- Critical dependencies

## Troubleshooting

### Issue: Blank Page After Deployment
- Check browser console for errors
- Verify `PUBLIC_URL` or `publicPath` is correct
- Ensure all assets are accessible

### Issue: API Calls Failing
- Check CORS configuration on backend
- Verify `REACT_APP_API_URL` is correct
- Check network tab in browser dev tools

### Issue: Routing Not Working
- Ensure web server is configured for client-side routing
- Check `try_files` or `RewriteRule` configuration

### Issue: Assets Not Loading
- Verify file permissions
- Check web server error logs
- Ensure correct `publicPath` in webpack config

## Checklist

Before deploying to production:

- [ ] Run `npm run build:production`
- [ ] Test build locally with a static server
- [ ] Update environment variables for production
- [ ] Configure SSL/TLS certificates
- [ ] Set up monitoring and logging
- [ ] Configure backups
- [ ] Test all critical user flows
- [ ] Verify API connectivity
- [ ] Check mobile responsiveness
- [ ] Test in multiple browsers
- [ ] Set up rollback strategy
- [ ] Document deployment process
- [ ] Configure CDN (if applicable)
- [ ] Set up health checks
- [ ] Enable gzip compression
- [ ] Configure caching headers

## Support

For deployment issues:
1. Check application logs
2. Check web server logs
3. Verify environment variables
4. Test API connectivity
5. Review build output for errors

For additional help, refer to:
- [Build Configuration Guide](./BUILD_CONFIGURATION.md)
- [Main Project README](../README.md)

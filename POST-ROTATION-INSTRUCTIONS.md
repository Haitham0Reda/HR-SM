# Post-Rotation Instructions

## ⚠️ CRITICAL: Complete These Steps Before Deploying

### 1. Update PostgreSQL Password

The database password has been rotated. Update PostgreSQL:

```bash
# Connect as superuser
psql -U postgres

# Update password (copy from .env file)
ALTER USER postgres WITH PASSWORD 'PQppiV9tlLp+VybVnpr2gr1cUYEy0q+C';

# Verify connection
\q
psql -U postgres -d hrsm-licenses -c "SELECT 1;"
```

### 2. Update Redis Password (if using Redis)

If `REDIS_ENABLED=true` in your `.env`:

```bash
# Edit redis.conf
sudo nano /etc/redis/redis.conf

# Add or update:
requirepass lOVxgLw7BKBpwgX+/ullWR7a0EkWBsId

# Restart Redis
sudo systemctl restart redis
```

### 3. Verify All Services Start

```bash
# Run verification
node verify-secrets.cjs

# Start all services
npm run dev
```

Expected output:
- ✅ SERVER (green) - Main API server on port 5000
- ✅ HR-APP (cyan) - HR application client
- ✅ PLATFORM (orange) - Platform admin client
- ✅ LICENSE (yellow) - License server on port 4000

### 4. Force Push to Remote (BREAKING CHANGE)

⚠️ **This will rewrite remote history. Coordinate with your team first!**

```bash
# Verify you're on the correct branch
git branch --show-current

# Force push (rewrites history)
git push origin --force --all
git push origin --force --tags
```

### 5. Notify All Team Members

Send this message:

```
🚨 URGENT: Repository Security Update

The repository history has been rewritten to remove committed secrets (.env and RSA keys).

REQUIRED ACTIONS:
1. Backup any local work
2. Delete your local repository
3. Re-clone: git clone https://github.com/Haitham0Reda/HR-SM.git
4. Request new .env file from team lead
5. DO NOT merge or rebase old branches

Timeline: Complete by [DATE]
Questions: Contact [TEAM LEAD]
```

### 6. Update Production Secrets

For production/staging environments:

1. **AWS Secrets Manager** (recommended):
   ```bash
   aws secretsmanager create-secret \
     --name hrsm/production/jwt-secret \
     --secret-string "c9939eadb96f02e854864096a7adbb5d85756b02bf2efa09bae95bf7fa61e024"
   ```

2. **Environment Variables** (alternative):
   - Update secrets in your deployment platform (Heroku, Vercel, etc.)
   - Restart all services after updating

3. **Docker Secrets** (if using Docker Swarm):
   ```bash
   echo "c9939eadb96f02e854864096a7adbb5d85756b02bf2efa09bae95bf7fa61e024" | \
     docker secret create jwt_secret -
   ```

### 7. Revoke Old Credentials

The following credentials from `.env.mongodb-rollback` are compromised:

- MongoDB user: `devhaithammoreda_db_user`
- MongoDB password: `cvF50PEZvfPVmKU3` (main)
- MongoDB password: `Jj9BcW2KPu4qLLWr` (license server)

**Actions:**
1. Delete or disable these MongoDB users
2. Rotate any other systems using these credentials
3. Check MongoDB Atlas access logs for unauthorized access

### 8. Enable Security Monitoring

Add pre-commit hooks to prevent future secret commits:

```bash
# Install git-secrets
brew install git-secrets  # macOS
# or
sudo apt-get install git-secrets  # Linux

# Initialize
git secrets --install
git secrets --register-aws

# Add custom patterns
git secrets --add 'JWT_SECRET=[A-Za-z0-9]{64}'
git secrets --add 'PASSWORD=[A-Za-z0-9+/]{20,}'
```

## Verification Checklist

Complete this checklist before marking the task as done:

- [ ] PostgreSQL password updated and tested
- [ ] Redis password updated (if applicable)
- [ ] All services start successfully (`npm run dev`)
- [ ] No errors in server logs
- [ ] Authentication works with new JWT secrets
- [ ] Force push completed to remote
- [ ] Team members notified
- [ ] Old MongoDB credentials revoked
- [ ] Production secrets updated
- [ ] Security monitoring enabled

## Rollback Plan (Emergency Only)

If services fail to start after rotation:

1. **Check logs**: `npm run dev` and review error messages
2. **Verify secrets**: `node verify-secrets.cjs`
3. **Database connection**: Test PostgreSQL connection manually
4. **Regenerate secrets**: `node generate-secrets.cjs` and update `.env`

## Support

If you encounter issues:

1. Check `SECURITY-ROTATION-COMPLETE.md` for detailed information
2. Run `node verify-secrets.cjs` to diagnose missing secrets
3. Review server logs for specific error messages
4. Contact DevOps team for production environment issues

---

**Last Updated:** May 3, 2026  
**Status:** Pending completion of post-rotation steps

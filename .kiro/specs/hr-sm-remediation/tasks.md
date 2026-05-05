# HR-SM Security Remediation Tasks

## CRITICAL (Immediate - Block Release)

### Task 1: Rotate MongoDB Credentials
- [ ] Rotate MongoDB Atlas user passwords immediately
- [ ] Regenerate MongoDB Atlas database user credentials
- [ ] Update any infrastructure using these credentials

**Files:** 
- ecosystem.config.js:14,61
- scripts/maintenance/verify-final-state.js:8,30
- scripts/maintenance/check-databases.js:3

### Task 2: Remove .env.test from Git
- [ ] `git rm --cached .env.test`
- [ ] Remove line 13 from .gitignore (`!.env.test`)
- [ ] Create clean .env.test.example if needed

**File:** .env.test

### Task 3: Secure/Delete .env.mongodb-rollback
- [ ] Delete file (contains production credentials)
- [ ] OR move to secure vault (AWS Secrets Manager, HashiCorp Vault)

**File:** .env.mongodb-rollback

### Task 4: Fix .gitignore
- [ ] Remove line 13 (`!.env.test`)
- [ ] Ensure .env.* is properly ignored

**File:** .gitignore

### Task 5: Remove Plaintext Password Feature
- [ ] Remove plain_password field from user.model.js
- [ ] Remove getUserPlainPassword from user.controller.js
- [ ] Remove /plain-password route from user.routes.js
- [ ] Remove getPlainPassword from frontend user.service.js

**Files:** 
- server/modules/hr-core/users/models/user.model.js:52-61
- server/modules/hr-core/users/controllers/user.controller.js:942-996
- server/modules/hr-core/users/routes.js:112

---

## HIGH PRIORITY

### Task 6: Secure RSA Keys
- [ ] Move hrsm-license-server/keys/ to secure storage
- [ ] Never commit private keys to repository

### Task 7: Remove Client node_modules from Git
- [ ] `git rm --cached -r docs/client/node_modules`
- [ ] Add to .gitignore

---

## Estimated Effort: 1-2 days for CRITICAL items
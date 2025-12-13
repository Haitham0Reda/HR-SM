# Subscription Models

## Plan Model
The `Plan.js` file defines subscription plans with pricing tiers and included modules.

## Subscription Model
The Subscription model is **embedded within the Tenant model** (see `server/platform/tenants/models/Tenant.js`).

This design decision was made because:
1. Each tenant has exactly one subscription
2. Subscription data is always accessed in the context of a tenant
3. Embedding reduces database queries and improves performance
4. Simplifies data consistency

The subscription schema in the Tenant model includes:
- `planId`: Reference to the Plan
- `status`: active, expired, cancelled, trial
- `startDate`: When subscription started
- `expiresAt`: When subscription expires
- `autoRenew`: Whether to auto-renew
- `billingCycle`: monthly or yearly

If you need to work with subscriptions separately in the future, you can extract the subscription schema into a separate collection, but for now it's embedded for simplicity and performance.

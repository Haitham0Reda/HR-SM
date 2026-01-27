# Events Collection Setup

## Issue
The events collection doesn't exist in the database until the first event is created for a tenant.

## Solution

### 1. Model Update
The Event model now explicitly specifies the collection name:
```javascript
{
    timestamps: true,
    collection: 'events'
}
```

### 2. Automatic Collection Creation
MongoDB automatically creates collections when:
- The first document is inserted
- Indexes are created on the collection

### 3. Manual Initialization (Optional)

If you need to ensure the events collection exists before any events are created, you can run:

```bash
# Initialize for all tenants
node server/scripts/init-events-collection.js

# Initialize for a specific tenant
node server/scripts/init-events-collection.js <tenantId>
```

## How It Works

The Event model uses multi-tenant database architecture:
- Each tenant has their own database
- The EventRepository gets a tenant-specific connection
- Collections are created per-tenant when needed

## Normal Behavior

It's **completely normal** for the events collection to not exist until:
1. The first event is created for that tenant, OR
2. The initialization script is run

The application handles empty collections gracefully - querying a non-existent collection simply returns an empty array.

## Troubleshooting

If you see "collection does not exist" errors:
1. This is usually just an informational message
2. The collection will be created automatically on first insert
3. You can pre-create it using the init script above
4. Check that the tenant database connection is working properly

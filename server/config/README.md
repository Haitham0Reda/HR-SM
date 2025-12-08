# Module Configuration System

This directory contains the module configuration system for the HRMS productization feature. The system enables granular module-level licensing, pricing tiers, and commercial controls.

## Overview

The module configuration system provides:

- **Schema validation** for module configurations
- **Commercial metadata** including pricing, limits, and marketing information
- **Module registry** with all product modules and their configurations
- **Helper utilities** for working with module configurations

## Files

### `moduleConfigSchema.js`

Defines the schema for module configurations and provides validation functions.

**Key exports:**

- `moduleConfigSchema` - The complete schema definition
- `validateModuleConfig(config)` - Validates a module configuration
- `PRICING_TIERS` - Constants for pricing tiers (STARTER, BUSINESS, ENTERPRISE)
- `LIMIT_TYPES` - Constants for limit types (EMPLOYEES, DEVICES, STORAGE, API_CALLS, RECORDS)

### `commercialModuleRegistry.js`

Contains all module configurations with commercial metadata, pricing, and limits.

**Key exports:**

- `commercialModuleConfigs` - All module configurations
- `validateAllModuleConfigs()` - Validates all registered modules
- `getModuleConfig(moduleKey)` - Get configuration for a specific module
- `getModulePricing(moduleKey, tier)` - Get pricing for a module and tier
- `getModuleDependencies(moduleKey, includeOptional)` - Get module dependencies
- `hasFeatureInTier(moduleKey, featureName, tier)` - Check if feature is available in tier
- `getMarketingSummary()` - Get marketing information for all modules

### `createModuleConfig.js`

Helper utilities for creating and managing module configurations.

**Key exports:**

- `createModuleConfigTemplate(moduleKey, displayName)` - Create a new module config template
- `formatStorageSize(bytes)` - Format bytes to human-readable size
- `parseStorageSize(sizeStr)` - Parse size string to bytes
- `calculateMonthlyCost(configs, tier, employeeCount)` - Calculate total monthly cost
- `calculateOnPremiseCost(configs, tier)` - Calculate total on-premise cost
- `suggestTier(config, usage)` - Suggest appropriate tier based on usage

### `index.js`

Central export point for all configuration functionality.

## Module Configuration Structure

Each module must define a configuration object with the following structure:

```javascript
{
  // Module identification
  key: "module-key",              // Unique identifier (kebab-case)
  displayName: "Module Name",     // Human-readable name
  version: "1.0.0",               // Semantic version

  // Commercial information
  commercial: {
    description: "Marketing description of the module",
    targetSegment: "Target customer segment",
    valueProposition: "Value proposition for customers",

    pricing: {
      starter: {
        monthly: 5,               // Price per employee/month
        onPremise: 500,           // One-time on-premise price
        limits: {
          employees: 50,
          storage: 1073741824,    // 1GB in bytes
          apiCalls: 10000,
          records: 5000
        }
      },
      business: {
        monthly: 10,
        onPremise: 1500,
        limits: {
          employees: 200,
          storage: 10737418240,   // 10GB
          apiCalls: 50000,
          records: 25000
        }
      },
      enterprise: {
        monthly: "custom",        // Can be number or "custom"
        onPremise: "custom",
        limits: {
          employees: "unlimited", // Can be number or "unlimited"
          storage: "unlimited",
          apiCalls: "unlimited",
          records: "unlimited"
        }
      }
    }
  },

  // Technical dependencies
  dependencies: {
    required: ["hr-core"],        // Modules that must be enabled
    optional: ["reporting"]       // Modules that enhance functionality
  },

  // Feature flags within module (optional)
  features: {
    advancedFeature: { tier: "business" },
    premiumFeature: { tier: "enterprise" }
  },

  // Integration points (optional)
  integrations: {
    provides: ["data-export", "api-access"],
    consumes: ["employee-roster", "calendar"]
  }
}
```

## Usage Examples

### Validate a Module Configuration

```javascript
import { validateModuleConfig } from "./config/index.js";

try {
  validateModuleConfig(myModuleConfig);
  console.log("Configuration is valid");
} catch (error) {
  console.error("Validation errors:", error.errors);
}
```

### Get Module Information

```javascript
import { getModuleConfig, getModulePricing } from "./config/index.js";

// Get full module configuration
const config = getModuleConfig("attendance");

// Get pricing for a specific tier
const pricing = getModulePricing("attendance", "starter");
console.log(`Monthly: $${pricing.monthly}/employee`);
console.log(`On-Premise: $${pricing.onPremise}`);
```

### Check Dependencies

```javascript
import { getModuleDependencies } from "./config/index.js";

// Get all required dependencies (including transitive)
const deps = getModuleDependencies("payroll", false);
console.log("Required modules:", deps);

// Include optional dependencies
const allDeps = getModuleDependencies("payroll", true);
console.log("All dependencies:", allDeps);
```

### Calculate Costs

```javascript
import {
  getModuleConfig,
  calculateMonthlyCost,
  calculateOnPremiseCost,
} from "./config/index.js";

const modules = [
  getModuleConfig("attendance"),
  getModuleConfig("leave"),
  getModuleConfig("payroll"),
];

// Calculate monthly SaaS cost for 100 employees
const monthlyCost = calculateMonthlyCost(modules, "business", 100);
console.log(`Monthly cost: $${monthlyCost}`);

// Calculate one-time on-premise cost
const onPremiseCost = calculateOnPremiseCost(modules, "business");
console.log(`On-premise cost: $${onPremiseCost}`);
```

### Suggest Appropriate Tier

```javascript
import { getModuleConfig, suggestTier } from "./config/index.js";

const config = getModuleConfig("attendance");
const currentUsage = {
  employees: 150,
  storage: 5000000000,
  apiCalls: 30000,
  records: 20000,
};

const recommendedTier = suggestTier(config, currentUsage);
console.log(`Recommended tier: ${recommendedTier}`);
```

### Check Feature Availability

```javascript
import { hasFeatureInTier } from "./config/index.js";

const hasFeature = hasFeatureInTier(
  "attendance",
  "biometricDevices",
  "business"
);

if (hasFeature) {
  console.log("Biometric devices are available in Business tier");
}
```

## Validation Rules

The module configuration system enforces the following rules:

1. **Required Fields**: All required fields must be present and non-empty
2. **Key Format**: Module keys must be in kebab-case (lowercase with hyphens)
3. **Version Format**: Versions must follow semantic versioning (X.Y.Z)
4. **Description Length**: Descriptions must be 20-500 characters
5. **Pricing Tiers**: All three tiers (starter, business, enterprise) must be defined
6. **Consistent Limits**: All tiers must have the same limit types
7. **No Self-Dependencies**: Modules cannot depend on themselves
8. **No Circular Dependencies**: Dependency chains cannot form loops

## Adding a New Module

To add a new module to the system:

1. Create a configuration object following the structure above
2. Add it to `commercialModuleConfigs` in `commercialModuleRegistry.js`
3. Ensure all dependencies are valid module keys
4. Run validation: `validateAllModuleConfigs()`
5. Add tests for the new module

Example:

```javascript
import { createModuleConfigTemplate } from "./config/index.js";

// Create a template
const newModule = createModuleConfigTemplate("new-module", "New Module");

// Customize the template
newModule.commercial.description = "Description of the new module";
newModule.commercial.pricing.starter.monthly = 5;
// ... customize other fields

// Validate
validateModuleConfig(newModule);

// Add to registry
commercialModuleConfigs["new-module"] = newModule;
```

## Testing

Run the module configuration tests:

```bash
npm test -- server/testing/config/moduleConfig.test.js
```

The test suite covers:

- Schema validation
- Module registry operations
- Dependency resolution
- Pricing calculations
- Helper utilities
- Integration scenarios

## Requirements Validation

This module configuration system validates the following requirements:

- **Requirement 2.1**: Module registration with display name, description, and segment
- **Requirement 2.2**: Pricing tier mapping for each module
- **Requirement 2.3**: Feature limits and usage quotas
- **Requirement 2.4**: Required and optional dependencies
- **Requirement 2.5**: Marketing-friendly descriptions for pricing pages

## Next Steps

After setting up the module configuration system:

1. Implement license validation service (Task 3)
2. Create license data models (Task 2)
3. Build license validation middleware (Task 5)
4. Integrate with frontend license context (Task 11)
5. Create pricing page UI (Task 15)

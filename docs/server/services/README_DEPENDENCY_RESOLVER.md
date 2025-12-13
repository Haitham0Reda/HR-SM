# Module Dependency Resolver

## Overview

The Dependency Resolver service provides comprehensive dependency management for the modular HRMS system. It handles dependency graph resolution, circular dependency detection, transitive dependency resolution, and module activation validation.

## Features

- **Dependency Graph Building**: Creates an adjacency list representation of all module dependencies
- **Circular Dependency Detection**: Identifies circular dependencies using depth-first search
- **Transitive Dependency Resolution**: Resolves all dependencies including indirect ones
- **Module Activation Validation**: Validates that all required dependencies are enabled before activating a module
- **Activation Order Calculation**: Determines the correct order to activate modules using topological sort
- **Dependency Checking**: Checks if one module depends on another (directly or transitively)
- **Dependent Discovery**: Finds all modules that depend on a given module
- **Graph Validation**: Validates the entire dependency graph for consistency
- **Dependency Tree Visualization**: Generates tree structures for visualization

## Usage

### Basic Usage

```javascript
import { dependencyResolver } from "./services/dependencyResolver.service.js";

// Resolve all dependencies for a module
const deps = dependencyResolver.resolveDependencies("payroll", false);
// Returns: ['hr-core', 'attendance']

// Check if module A depends on module B
const depends = dependencyResolver.dependsOn("payroll", "hr-core");
// Returns: true

// Get activation order for modules
const order = dependencyResolver.getActivationOrder(["payroll", "leave"]);
// Returns: ['hr-core', 'attendance', 'payroll', 'leave']
```

### Integration with Commercial Module Registry

```javascript
import {
  validateModuleActivation,
  getModuleActivationOrder,
  checkModuleDependency,
} from "./config/commercialModuleRegistry.js";

// Validate module activation
const result = await validateModuleActivation("attendance", ["hr-core"]);
if (result.valid) {
  console.log("Module can be activated");
} else {
  console.log("Missing dependencies:", result.missingDependencies);
}

// Get activation order
const order = await getModuleActivationOrder(["payroll"]);
console.log("Activate in this order:", order);

// Check dependency
const depends = await checkModuleDependency("payroll", "hr-core");
console.log("Payroll depends on hr-core:", depends);
```

## API Reference

### DependencyResolver Class

#### `buildDependencyGraph()`

Builds a dependency graph for all modules.

**Returns**: `Map<string, Set<string>>` - Adjacency list representation

#### `detectCircularDependencies()`

Detects circular dependencies in the module graph.

**Returns**: `Array<Array<string>>` - Array of circular dependency chains

#### `resolveDependencies(moduleKey, includeOptional)`

Resolves all dependencies for a module (including transitive).

**Parameters**:

- `moduleKey` (string): Module to resolve dependencies for
- `includeOptional` (boolean): Whether to include optional dependencies

**Returns**: `Array<string>` - Array of all dependencies

**Throws**: `DependencyError` if module not found

#### `resolveTransitiveDependencies(moduleKey)`

Resolves transitive dependencies (dependencies of dependencies).

**Parameters**:

- `moduleKey` (string): Module to resolve

**Returns**: Object with `direct` and `transitive` properties

#### `validateModuleActivation(moduleKey, enabledModules)`

Validates that a module can be activated.

**Parameters**:

- `moduleKey` (string): Module to validate
- `enabledModules` (Array<string>): Currently enabled modules

**Returns**: Object with `valid`, `errors`, `missingDependencies`, and `requiredDependencies`

#### `getActivationOrder(moduleKeys)`

Gets activation order for a set of modules.

**Parameters**:

- `moduleKeys` (Array<string>): Modules to activate

**Returns**: `Array<string>` - Modules in dependency order

**Throws**: `DependencyError` if circular dependency detected

#### `dependsOn(moduleA, moduleB)`

Checks if module A depends on module B (directly or transitively).

**Parameters**:

- `moduleA` (string): Module to check
- `moduleB` (string): Potential dependency

**Returns**: `boolean` - True if A depends on B

#### `getDependents(moduleKey)`

Gets all modules that depend on a given module.

**Parameters**:

- `moduleKey` (string): Module to check

**Returns**: `Array<string>` - Modules that depend on this module

#### `validateDependencyGraph()`

Validates entire dependency graph for consistency.

**Returns**: Object with `valid`, `errors`, and `warnings`

#### `getDependencyTree(moduleKey, maxDepth)`

Gets dependency tree for visualization.

**Parameters**:

- `moduleKey` (string): Root module
- `maxDepth` (number): Maximum depth to traverse (default: 10)

**Returns**: Tree structure object

## Error Handling

The service throws `DependencyError` for dependency-related errors:

```javascript
try {
  const deps = dependencyResolver.resolveDependencies("non-existent");
} catch (error) {
  if (error instanceof DependencyError) {
    console.error("Dependency error:", error.message);
    console.error("Details:", error.details);
  }
}
```

## Validation Results

### Module Activation Validation

```javascript
{
    valid: boolean,
    errors: Array<string>,
    missingDependencies: Array<string>,
    requiredDependencies: Array<string>
}
```

### Graph Validation

```javascript
{
    valid: boolean,
    errors: Array<{
        type: 'CIRCULAR_DEPENDENCY' | 'MISSING_DEPENDENCY' | 'SELF_DEPENDENCY',
        message: string,
        module?: string,
        dependency?: string,
        cycle?: Array<string>
    }>,
    warnings: Array<{
        type: 'ORPHANED_MODULE',
        message: string,
        module: string
    }>
}
```

## Examples

See `dependencyResolver.example.js` for comprehensive usage examples.

## Testing

Run tests with:

```bash
npm test -- dependencyResolver.service.test.js
```

All tests are located in `server/testing/services/dependencyResolver.service.test.js`.

## Requirements Validated

This implementation validates the following requirements from the feature specification:

- **Requirement 1.4**: Dependency enforcement - modules cannot be enabled without their required dependencies
- **Requirement 8.2**: Module independence - modules use only defined integration APIs
- **Requirement 8.5**: Optional integration graceful degradation - modules function without optional integrations

## Design Properties Validated

- **Property 4**: Dependency Enforcement - attempting to enable a module without dependencies fails
- **Property 26**: Optional Integration Graceful Degradation - modules work without optional dependencies

## Implementation Notes

- Uses depth-first search (DFS) for circular dependency detection
- Uses Kahn's algorithm (topological sort) for activation order calculation
- Maintains visited sets to prevent infinite recursion
- Validates graph consistency on startup
- Provides both sync and async APIs for flexibility

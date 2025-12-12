/**
 * Module Registry System - Main Export
 * 
 * Exports all module registry components for easy importing
 */

import moduleRegistry from './moduleRegistry.js';
import moduleLoader from './moduleLoader.js';
import moduleInitializer from './moduleInitializer.js';
import featureFlagService from './featureFlagService.js';
import dependencyResolver from './dependencyResolver.js';

export {
    moduleRegistry,
    moduleLoader,
    moduleInitializer,
    featureFlagService,
    dependencyResolver
};

export default {
    moduleRegistry,
    moduleLoader,
    moduleInitializer,
    featureFlagService,
    dependencyResolver
};

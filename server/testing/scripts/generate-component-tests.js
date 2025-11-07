#!/usr/bin/env node

/**
 * Script to generate tests for specific components
 * Usage: node scripts/generate-component-tests.js <component-type> <component-name>
 * Example: node scripts/generate-component-tests.js model user
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const componentType = args[0];
const componentName = args[1];

if (!componentType || !componentName) {
    console.error('Usage: node scripts/generate-component-tests.js <component-type> <component-name>');
    console.error('Example: node scripts/generate-component-tests.js model user');
    console.error('Component types: controller, model, middleware, route');
    process.exit(1);
}

// Map of component types to their directories and extensions
const componentMap = {
    controller: { src: 'server/controller', test: '__tests__/controllers', ext: '.controller.js', testExt: '.controller.test.js' },
    model: { src: 'server/models', test: '__tests__/models', ext: '.model.js', testExt: '.model.test.js' },
    middleware: { src: 'server/middleware', test: '__tests__/middleware', ext: 'Middleware.js', testExt: 'Middleware.test.js' },
    route: { src: 'server/routes', test: '__tests__/routes', ext: '.routes.js', testExt: '.routes.test.js' }
};

const componentInfo = componentMap[componentType];
if (!componentInfo) {
    console.error(`Invalid component type: ${componentType}. Valid types are: controller, model, middleware, route`);
    process.exit(1);
}

// Function to generate test template based on component type
function generateTestTemplate(componentType, componentName) {
    const className = componentName.charAt(0).toUpperCase() + componentName.slice(1);
    
    switch (componentType) {
        case 'model':
            return generateModelTestTemplate(className, componentName);
        case 'controller':
            return generateControllerTestTemplate(className, componentName);
        case 'middleware':
            return generateMiddlewareTestTemplate(className, componentName);
        case 'route':
            return generateRouteTestTemplate(className, componentName);
        default:
            return generateGenericTestTemplate(className, componentName);
    }
}

function generateModelTestTemplate(className, fileName) {
    return `import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ${className} from '../../server/models/${fileName}.model.js';

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('${className} Model', () => {
    beforeEach(async () => {
        // Clear database before each test
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany({});
        }
    });

    it('should create and save a ${className} successfully', async () => {
        const ${fileName}Data = {
            // TODO: Add required fields for ${className}
        };

        const ${fileName} = new ${className}(${fileName}Data);
        const saved${className} = await ${fileName}.save();
        
        expect(saved${className}).toBeDefined();
        expect(saved${className}._id).toBeDefined();
        // TODO: Add more assertions based on your model fields
    });

    it('should fail to create ${fileName} without required fields', async () => {
        const ${fileName} = new ${className}();
        let err;
        
        try {
            await ${fileName}.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).toBeDefined();
        expect(err.name).toBe('ValidationError');
    });

    // TODO: Add more test cases for your model
});
`;
}

function generateControllerTestTemplate(className, fileName) {
    return `import request from 'supertest';
import express from 'express';
import ${fileName}Controller from '../../server/controller/${fileName}.controller.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;
const app = express();
app.use(express.json());

// TODO: Add your controller routes here
// app.get('/api/${fileName}', ${fileName}Controller.getMethod);
// app.post('/api/${fileName}', ${fileName}Controller.postMethod);

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('${className} Controller', () => {
    beforeEach(async () => {
        // Clear database before each test
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany({});
        }
    });

    it('should perform its primary function', async () => {
        // TODO: Add your test implementation
        // const res = await request(app).get('/api/${fileName}');
        // expect(res.status).toBe(200);
    });

    it('should handle errors appropriately', async () => {
        // TODO: Add your error handling test
    });

    // TODO: Add more test cases for your controller
});
`;
}

function generateMiddlewareTestTemplate(className, fileName) {
    return `import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import ${fileName}Middleware from '../../server/middleware/${fileName}Middleware.js';

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('${className} Middleware', () => {
    beforeEach(async () => {
        // Clear database before each test
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany({});
        }
    });

    it('should pass through middleware successfully', () => {
        // Create mock request, response, and next function
        const req = {};
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        // Call your middleware function
        // ${fileName}Middleware.yourMiddlewareFunction(req, res, next);
        
        // Expect next to be called
        // expect(next).toHaveBeenCalled();
    });

    it('should handle errors appropriately', () => {
        // TODO: Test error conditions
    });

    // TODO: Add more test cases for your middleware
});
`;
}

function generateRouteTestTemplate(className, fileName) {
    return `import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ${fileName}Routes from '../../server/routes/${fileName}.routes.js';

let mongoServer;
const app = express();
app.use(express.json());

// Register your routes
// app.use('/api/${fileName}', ${fileName}Routes);

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('${className} Routes', () => {
    beforeEach(async () => {
        // Clear database before each test
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany({});
        }
    });

    it('should return 200 for GET request', async () => {
        // TODO: Add your test implementation
        // const res = await request(app).get('/api/${fileName}');
        // expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent route', async () => {
        // TODO: Add your test implementation
        // const res = await request(app).get('/api/non-existent');
        // expect(res.status).toBe(404);
    });

    // TODO: Add more test cases for your routes
});
`;
}

function generateGenericTestTemplate(className, fileName) {
    return `import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('${className}', () => {
    beforeEach(async () => {
        // Clear database before each test
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany({});
        }
    });

    it('should perform its primary function', () => {
        // TODO: Add your test implementation
    });

    it('should handle errors appropriately', () => {
        // TODO: Add your error handling test
    });

    // TODO: Add more test cases
});
`;
}

// Generate the test file
const testDir = componentInfo.test;
const srcDir = componentInfo.src;
const srcFileName = componentName + componentInfo.ext;
const testFileName = componentName + componentInfo.testExt;

// Check if source file exists
const srcPath = path.join(process.cwd(), srcDir, srcFileName);
if (!fs.existsSync(srcPath)) {
    console.error(`Source file does not exist: ${srcPath}`);
    console.error('Available files in directory:');
    try {
        const files = fs.readdirSync(path.join(process.cwd(), srcDir));
        files.forEach(file => console.log(`- ${file}`));
    } catch (err) {
        console.error(`Could not read directory: ${err.message}`);
    }
    process.exit(1);
}

// Create test directory if it doesn't exist
const testPathDir = path.join(process.cwd(), testDir);
if (!fs.existsSync(testPathDir)) {
    fs.mkdirSync(testPathDir, { recursive: true });
}

// Generate test template
const testContent = generateTestTemplate(componentType, componentName);
const testPath = path.join(testPathDir, testFileName);

// Write test file
fs.writeFileSync(testPath, testContent);
console.log(`✅ Test template created: ${testPath}`);
console.log(`📝 Next steps:`);
console.log(`1. Open the test file and customize it for your component`);
console.log(`2. Run the test with: npm test -- ${testPath.replace(/\\/g, '/')}`);
console.log(`3. Implement the TODOs in the test file`);
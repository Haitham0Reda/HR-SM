#!/usr/bin/env node

/**
 * Script to generate test templates for missing test files
 * Usage: node scripts/generate-test-template.js <type> <filename>
 * Example: node scripts/generate-test-template.js controller user.controller.js
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const type = args[0];
const filename = args[1];

if (!type || !filename) {
    console.error('Usage: node scripts/generate-test-template.js <type> <filename>');
    console.error('Example: node scripts/generate-test-template.js controller user.controller.js');
    process.exit(1);
}

// Map of types to their directories
const typeMap = {
    controller: { src: 'server/controller', test: '__tests__/controllers' },
    model: { src: 'server/models', test: '__tests__/models' },
    middleware: { src: 'server/middleware', test: '__tests__/middleware' },
    route: { src: 'server/routes', test: '__tests__/routes' }
};

const typeInfo = typeMap[type];
if (!typeInfo) {
    console.error(`Invalid type: ${type}. Valid types are: controller, model, middleware, route`);
    process.exit(1);
}

// Function to generate test template based on file type
function generateTestTemplate(filePath, fileType) {
    const baseName = path.basename(filePath, path.extname(filePath));
    // Extract the main name part (e.g., user from user.model)
    const mainName = baseName.split('.')[0];
    const className = mainName.charAt(0).toUpperCase() + mainName.slice(1);
    
    switch (fileType) {
        case 'model':
            return generateModelTestTemplate(className, baseName, mainName);
        case 'controller':
            return generateControllerTestTemplate(className, baseName, mainName);
        case 'middleware':
            return generateMiddlewareTestTemplate(className, baseName, mainName);
        case 'route':
            return generateRouteTestTemplate(className, baseName, mainName);
        default:
            return generateGenericTestTemplate(className, baseName, mainName);
    }
}

function generateModelTestTemplate(className, fileName, mainName) {
    return `import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ${className} from '../../server/models/${fileName}.js';

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
        await ${className}.deleteMany({});
    });

    it('should create and save a ${className} successfully', async () => {
        const ${mainName}Data = {
            // Add required fields here
        };

        const ${mainName} = new ${className}(${mainName}Data);
        const saved${className} = await ${mainName}.save();
        
        expect(saved${className}).toBeDefined();
        expect(saved${className}._id).toBeDefined();
        // Add more assertions based on your model fields
    });

    it('should fail to create ${mainName} without required fields', async () => {
        const ${mainName} = new ${className}();
        let err;
        
        try {
            await ${mainName}.save();
        } catch (error) {
            err = error;
        }
        
        expect(err).toBeDefined();
        expect(err.name).toBe('ValidationError');
    });
});
`;
}

function generateControllerTestTemplate(className, fileName, mainName) {
    return `import request from 'supertest';
import express from 'express';
import ${mainName} from '../../server/controller/${fileName}.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;
const app = express();
app.use(express.json());

// Mock routes for testing
// Add your controller routes here
// app.get('/api/test', ${mainName}.yourMethod);

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

    it('should return 200 for successful request', async () => {
        // Add your test implementation
        // const res = await request(app).get('/api/test');
        // expect(res.status).toBe(200);
    });

    it('should handle errors appropriately', async () => {
        // Add your error handling test
    });
});
`;
}

function generateMiddlewareTestTemplate(className, fileName, mainName) {
    return `import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import ${mainName} from '../../server/middleware/${fileName}.js';

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
        // ${mainName}.yourMiddlewareFunction(req, res, next);
        
        // Expect next to be called
        // expect(next).toHaveBeenCalled();
    });

    it('should handle errors appropriately', () => {
        // Test error conditions
    });
});
`;
}

function generateRouteTestTemplate(className, fileName, mainName) {
    return `import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ${mainName} from '../../server/routes/${fileName}.js';

let mongoServer;
const app = express();
app.use(express.json());

// Register your routes
// app.use('/api/your-route', ${mainName});

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
        // const res = await request(app).get('/api/your-route');
        // expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent route', async () => {
        // const res = await request(app).get('/api/non-existent');
        // expect(res.status).toBe(404);
    });
});
`;
}

function generateGenericTestTemplate(className, fileName, mainName) {
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
        // Add your test implementation
    });

    it('should handle errors appropriately', () => {
        // Add your error handling test
    });
});
`;
}

// Generate the test file
const testDir = typeInfo.test;
const srcDir = typeInfo.src;
const testFileName = filename.replace(/\.[^/.]+$/, "") + '.test.js';

// Check if source file exists
const srcPath = path.join(process.cwd(), srcDir, filename);
if (!fs.existsSync(srcPath)) {
    console.error(`Source file does not exist: ${srcPath}`);
    process.exit(1);
}

// Create test directory if it doesn't exist
const testPathDir = path.join(process.cwd(), testDir);
if (!fs.existsSync(testPathDir)) {
    fs.mkdirSync(testPathDir, { recursive: true });
}

// Generate test template
const testContent = generateTestTemplate(filename, type);
const testPath = path.join(testPathDir, testFileName);

// Write test file
fs.writeFileSync(testPath, testContent);
console.log(`Test template created: ${testPath}`);
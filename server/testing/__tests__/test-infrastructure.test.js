import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

describe('Test Infrastructure', () => {
    let mongoServer;

    beforeAll(async () => {
        // Setup in-memory MongoDB for testing
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        // Cleanup MongoDB connection
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    it('should have a working MongoDB connection', () => {
        expect(mongoose.connection.readyState).toBe(1); // Connected state
    });

    it('should be able to create and save a simple document', async () => {
        // Create a simple schema for testing
        const testSchema = new mongoose.Schema({
            name: String,
            value: Number
        });
        
        const TestModel = mongoose.model('Test', testSchema);
        
        // Create and save a test document
        const testData = { name: 'Test Document', value: 42 };
        const testDoc = new TestModel(testData);
        const savedDoc = await testDoc.save();
        
        // Verify the document was saved
        expect(savedDoc._id).toBeDefined();
        expect(savedDoc.name).toBe(testData.name);
        expect(savedDoc.value).toBe(testData.value);
        
        // Verify we can find the document
        const foundDoc = await TestModel.findById(savedDoc._id);
        expect(foundDoc).toBeDefined();
        expect(foundDoc.name).toBe(testData.name);
        expect(foundDoc.value).toBe(testData.value);
    });

    it('should be able to use Jest assertions', () => {
        expect(1 + 1).toBe(2);
        expect('hello').toContain('ell');
        expect([1, 2, 3]).toHaveLength(3);
        expect({ a: 1, b: 2 }).toHaveProperty('a');
    });
});
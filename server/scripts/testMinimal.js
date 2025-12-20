// Test minimal version to isolate the issue
class TestService {
    constructor() {
        this.test = true;
    }
    
    testMethod() {
        return 'working';
    }
}

const testService = new TestService();
export default testService;
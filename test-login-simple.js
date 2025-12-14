import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/v1';

async function testLogin() {
    console.log('Testing login...');
    
    const credentials = {
        email: 'admin@testcompany.com',
        password: 'admin123',
        tenantId: '693cd43ec91e4189aa2ecd2f'  // Test Company tenant ID from credentials output
    };
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });

        const data = await response.json();
        
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testLogin();
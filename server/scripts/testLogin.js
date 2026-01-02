import fetch from 'node-fetch';

const testLogin = async () => {
    try {
        console.log('🔐 Testing login...');
        
        const response = await fetch('http://localhost:5000/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@techcorp.com',
                password: 'admin123',
                tenantId: 'techcorp_solutions'
            })
        });

        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('✅ Login successful');
            
            // Test departments
            console.log('\n📂 Testing departments...');
            const deptResponse = await fetch('http://localhost:5000/api/v1/departments', {
                headers: {
                    'Authorization': `Bearer ${data.token}`
                }
            });

            const deptData = await deptResponse.json();
            console.log('Departments Response:', JSON.stringify(deptData, null, 2));
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
};

testLogin();
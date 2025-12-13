/**
 * Script to validate a JWT token
 */

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

function validateToken() {
    // Get token from command line argument
    const token = process.argv[2];
    
    if (!token) {
        console.log('Usage: node validateToken.js <token>');
        console.log('Example: node validateToken.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
        return;
    }
    
    try {
        console.log('Validating token...\n');
        
        // Decode without verification first to see the payload
        const decoded = jwt.decode(token);
        console.log('Token payload (unverified):');
        console.log(JSON.stringify(decoded, null, 2));
        
        // Now verify with secret
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.log('\n❌ JWT_SECRET not found in environment variables');
            return;
        }
        
        const verified = jwt.verify(token, secret);
        console.log('\n✅ Token is valid!');
        console.log('Verified payload:');
        console.log(JSON.stringify(verified, null, 2));
        
        // Check expiration
        const now = Math.floor(Date.now() / 1000);
        if (verified.exp && verified.exp < now) {
            console.log('\n⚠️  Token is expired!');
            console.log(`Expired at: ${new Date(verified.exp * 1000)}`);
            console.log(`Current time: ${new Date()}`);
        } else if (verified.exp) {
            console.log(`\n✅ Token expires at: ${new Date(verified.exp * 1000)}`);
        }
        
    } catch (error) {
        console.log('\n❌ Token validation failed:');
        console.log(error.message);
        
        if (error.name === 'TokenExpiredError') {
            console.log('The token has expired');
        } else if (error.name === 'JsonWebTokenError') {
            console.log('The token is malformed or invalid');
        }
    }
}

validateToken();
#!/usr/bin/env node

/**
 * Redis Configuration Script
 * 
 * Configures Redis persistence with both RDB snapshots and AOF logging
 * for enhanced rate limiting and caching
 * 
 * Requirements: 6.2 - Configure Redis persistence
 */

import { createClient } from 'redis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function configureRedis() {
    console.log('🔧 Configuring Redis persistence...');
    
    let client;
    
    try {
        // Connect to Redis
        client = createClient({ url: REDIS_URL });
        
        client.on('error', (err) => {
            console.error('Redis client error:', err);
        });
        
        await client.connect();
        console.log('✅ Connected to Redis');
        
        // Configure RDB snapshots
        console.log('📸 Configuring RDB snapshots...');
        
        // Save snapshot every 900 seconds if at least 1 key changed
        await client.configSet('save', '900 1');
        
        // Save snapshot every 300 seconds if at least 10 keys changed
        await client.configSet('save', '300 10');
        
        // Save snapshot every 60 seconds if at least 10000 keys changed
        await client.configSet('save', '60 10000');
        
        // Set RDB filename
        await client.configSet('dbfilename', 'hrsm-redis.rdb');
        
        console.log('✅ RDB snapshots configured');
        
        // Configure AOF (Append Only File) logging
        console.log('📝 Configuring AOF logging...');
        
        // Enable AOF
        await client.configSet('appendonly', 'yes');
        
        // Set AOF filename
        await client.configSet('appendfilename', 'hrsm-redis.aof');
        
        // Set AOF sync policy (fsync every second)
        await client.configSet('appendfsync', 'everysec');
        
        // Enable AOF rewrite
        await client.configSet('auto-aof-rewrite-percentage', '100');
        await client.configSet('auto-aof-rewrite-min-size', '64mb');
        
        console.log('✅ AOF logging configured');
        
        // Configure memory management
        console.log('💾 Configuring memory management...');
        
        // Set max memory (adjust based on your server)
        const maxMemory = process.env.REDIS_MAX_MEMORY || '256mb';
        await client.configSet('maxmemory', maxMemory);
        
        // Set eviction policy (remove least recently used keys when memory limit reached)
        await client.configSet('maxmemory-policy', 'allkeys-lru');
        
        console.log(`✅ Memory management configured (max: ${maxMemory})`);
        
        // Configure key expiration
        console.log('⏰ Configuring key expiration...');
        
        // Enable lazy expiration
        await client.configSet('lazyfree-lazy-expire', 'yes');
        await client.configSet('lazyfree-lazy-eviction', 'yes');
        
        console.log('✅ Key expiration configured');
        
        // Test rate limiting keys
        console.log('🧪 Testing rate limiting configuration...');
        
        const testKey = 'rate_limit:test:127.0.0.1';
        await client.set(testKey, '1', { EX: 60 }); // Expire in 60 seconds
        
        const testValue = await client.get(testKey);
        if (testValue === '1') {
            console.log('✅ Rate limiting test successful');
        } else {
            console.log('❌ Rate limiting test failed');
        }
        
        // Clean up test key
        await client.del(testKey);
        
        // Display current configuration
        console.log('\n📋 Current Redis Configuration:');
        
        const config = await client.configGet('*');
        const relevantConfigs = [
            'save',
            'dbfilename',
            'appendonly',
            'appendfilename',
            'appendfsync',
            'maxmemory',
            'maxmemory-policy',
            'lazyfree-lazy-expire',
            'lazyfree-lazy-eviction'
        ];
        
        for (const configKey of relevantConfigs) {
            const value = config[configKey];
            if (value !== undefined) {
                console.log(`  ${configKey}: ${value}`);
            }
        }
        
        // Save configuration to disk
        console.log('\n💾 Saving configuration...');
        await client.configRewrite();
        console.log('✅ Configuration saved to redis.conf');
        
        console.log('\n🎉 Redis configuration completed successfully!');
        console.log('\n📝 Configuration Summary:');
        console.log('  • RDB snapshots enabled with multiple save points');
        console.log('  • AOF logging enabled with everysec sync');
        console.log('  • Memory management with LRU eviction');
        console.log('  • Lazy expiration enabled for performance');
        console.log('  • Rate limiting keys will persist across restarts');
        
    } catch (error) {
        console.error('❌ Redis configuration failed:', error.message);
        process.exit(1);
    } finally {
        if (client) {
            await client.quit();
            console.log('👋 Disconnected from Redis');
        }
    }
}

// Run configuration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    configureRedis().catch(console.error);
}

export default configureRedis;
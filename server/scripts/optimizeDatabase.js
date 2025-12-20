#!/usr/bin/env node

/**
 * Database Optimization Script
 * Runs comprehensive database optimization including indexing, connection pooling, and performance monitoring
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { optimizeDatabase } from '../config/databaseOptimization.js';

// Load environment variables
dotenv.config();

const runOptimization = async () => {
  console.log('🚀 Starting Database Optimization Script...');
  console.log('=====================================');
  
  try {
    // Connect to main database
    console.log('📡 Connecting to main database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms', {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('✅ Connected to main database');
    
    // Run comprehensive optimization
    const result = await optimizeDatabase();
    
    console.log('=====================================');
    console.log('✅ Database Optimization Completed!');
    console.log('=====================================');
    console.log(`📊 Main Database Indexes Created: ${result.mainIndexes}`);
    console.log(`🔐 License Database Indexes Created: ${result.licenseIndexes}`);
    console.log(`📈 Total Indexes Created: ${result.totalIndexes}`);
    
    if (result.performanceReport) {
      console.log('\n📋 Performance Report Summary:');
      console.log(`   Database: ${result.performanceReport.database.name}`);
      console.log(`   Collections: ${result.performanceReport.database.collections}`);
      console.log(`   Total Objects: ${result.performanceReport.database.objects}`);
      console.log(`   Data Size: ${Math.round(result.performanceReport.database.dataSize / 1024 / 1024)}MB`);
      console.log(`   Index Size: ${Math.round(result.performanceReport.database.indexSize / 1024 / 1024)}MB`);
      
      if (result.performanceReport.recommendations.length > 0) {
        console.log('\n⚠️  Performance Recommendations:');
        result.performanceReport.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
        });
      } else {
        console.log('\n✅ No performance issues detected');
      }
    }
    
    console.log('\n🎉 Optimization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database optimization failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close connections
    try {
      await mongoose.connection.close();
      console.log('📡 Database connections closed');
    } catch (error) {
      console.error('Error closing connections:', error.message);
    }
    
    process.exit(0);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⏹️  Optimization interrupted by user');
  try {
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error closing connections:', error.message);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏹️  Optimization terminated');
  try {
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error closing connections:', error.message);
  }
  process.exit(0);
});

// Run the optimization
runOptimization();
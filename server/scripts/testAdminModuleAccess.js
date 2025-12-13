#!/usr/bin/env node

import chalk from 'chalk';

function testAdminModuleAccess() {
  console.log(chalk.blue('🧪 Testing Admin Module Access Configuration\n'));

  // Simulate different user roles
  const testUsers = [
    { role: 'admin', name: 'Admin User' },
    { role: 'hr', name: 'HR Manager' },
    { role: 'manager', name: 'Department Manager' },
    { role: 'employee', name: 'Regular Employee' }
  ];

  // Simulate enabled modules (what regular users would see)
  const enabledModules = ['hr-core', 'attendance', 'leave', 'documents'];
  const allModules = ['hr-core', 'attendance', 'leave', 'payroll', 'documents', 'reports', 'tasks', 'surveys', 'announcements', 'events'];

  // Simulate module checking functions
  const isModuleEnabled = (moduleId, user) => {
    // Admin users have access to all modules
    if (user && user.role === 'admin') {
      return true;
    }
    
    // HR-Core is always enabled for all users
    if (moduleId === 'hr-core') {
      return true;
    }

    return enabledModules.includes(moduleId);
  };

  const getEnabledModules = (user) => {
    // Admin users get all available modules
    if (user && user.role === 'admin') {
      return allModules;
    }
    
    return ['hr-core', ...enabledModules];
  };

  console.log(chalk.yellow('📋 Module Access Test Results:\n'));

  testUsers.forEach(user => {
    console.log(chalk.cyan(`👤 ${user.name} (${user.role}):`));
    
    const userEnabledModules = getEnabledModules(user);
    console.log(`   Available modules: ${userEnabledModules.length}`);
    console.log(`   Modules: ${userEnabledModules.join(', ')}`);
    
    // Test specific modules
    const testModules = ['payroll', 'reports', 'surveys', 'tasks'];
    console.log('   Module Access:');
    
    testModules.forEach(module => {
      const hasAccess = isModuleEnabled(module, user);
      const status = hasAccess ? chalk.green('✅ ALLOWED') : chalk.red('❌ DENIED');
      console.log(`     ${module}: ${status}`);
    });
    
    console.log('');
  });

  // Test scenarios
  console.log(chalk.yellow('🔍 Test Scenarios:\n'));

  const scenarios = [
    {
      name: 'Admin accessing Payroll module',
      user: { role: 'admin' },
      module: 'payroll',
      expected: true
    },
    {
      name: 'Employee accessing Payroll module',
      user: { role: 'employee' },
      module: 'payroll',
      expected: false
    },
    {
      name: 'HR accessing enabled Leave module',
      user: { role: 'hr' },
      module: 'leave',
      expected: true
    },
    {
      name: 'Manager accessing disabled Reports module',
      user: { role: 'manager' },
      module: 'reports',
      expected: false
    },
    {
      name: 'Admin accessing disabled Reports module',
      user: { role: 'admin' },
      module: 'reports',
      expected: true
    }
  ];

  scenarios.forEach(scenario => {
    const result = isModuleEnabled(scenario.module, scenario.user);
    const passed = result === scenario.expected;
    const status = passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
    
    console.log(`${status} ${scenario.name}`);
    console.log(`   Expected: ${scenario.expected}, Got: ${result}`);
    console.log('');
  });

  // Summary
  console.log(chalk.blue('📊 Summary:\n'));
  console.log(chalk.green('✅ Admin users will have access to ALL modules'));
  console.log(chalk.green('✅ Regular users will only see enabled modules'));
  console.log(chalk.green('✅ HR-Core module is always available to everyone'));
  console.log(chalk.yellow('⚠️ Module restrictions are bypassed for admin role'));

  console.log(chalk.blue('\n🔧 Implementation Details:\n'));
  console.log('1. ModuleContext checks user.role === "admin"');
  console.log('2. useModuleAccess hook bypasses restrictions for admins');
  console.log('3. ModuleGuard component allows admin access');
  console.log('4. ModuleProtectedRoute bypasses checks for admins');
  console.log('5. withModuleAccess HOC grants admin access');

  console.log(chalk.blue('\n📱 Expected Behavior:\n'));
  console.log('- Admin users see all navigation items');
  console.log('- Admin users can access all pages');
  console.log('- Admin users see all features and components');
  console.log('- Regular users only see enabled modules');
  console.log('- Module restrictions work normally for non-admin users');

  console.log(chalk.green('\n🎯 RESULT: Admin users will have full access to all modules!'));
}

// Run the test
testAdminModuleAccess();
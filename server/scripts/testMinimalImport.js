try {
    console.log('Testing minimal service import...');
    const minimal = await import('./testMinimal.js');
    console.log('Minimal service imported successfully');
    console.log('Available exports:', Object.keys(minimal));
    console.log('Default export:', minimal.default);
    console.log('Test method result:', minimal.default.testMethod());
} catch (error) {
    console.error('Import error:', error.message);
}
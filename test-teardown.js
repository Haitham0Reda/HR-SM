import { execSync } from 'child_process';

export default async function globalTeardown() {
    console.log('\n📊 Generating test report...\n');

    try {
        // Generate report after all tests complete
        execSync('node generate_test_report.js', {
            stdio: 'inherit',
            encoding: 'utf8'
        });
    } catch (error) {
        console.error('Failed to generate test report:', error.message);
    }
}

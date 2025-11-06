/**
 * Task Scheduler
 * 
 * Simple scheduler to run periodic tasks
 * In a production environment, you would use a proper job scheduler like node-cron or bull
 */

import { sendPendingRequestReminders } from './pendingRequestReminder.js';

// Store for intervals
const intervals = new Map();

/**
 * Schedule a task to run at specified intervals
 * @param {string} name - Name of the task
 * @param {Function} task - Function to execute
 * @param {number} interval - Interval in milliseconds
 */
export function scheduleTask(name, task, interval) {
    // Clear existing interval if any
    if (intervals.has(name)) {
        clearInterval(intervals.get(name));
    }
    
    // Schedule the task
    const intervalId = setInterval(async () => {
        try {
            console.log(`⏰ Running scheduled task: ${name}`);
            await task();
        } catch (error) {
            console.error(`Error in scheduled task ${name}:`, error);
        }
    }, interval);
    
    // Store the interval ID
    intervals.set(name, intervalId);
    
    console.log(`✅ Scheduled task "${name}" to run every ${interval / 1000} seconds`);
}

/**
 * Stop a scheduled task
 * @param {string} name - Name of the task to stop
 */
export function stopTask(name) {
    if (intervals.has(name)) {
        clearInterval(intervals.get(name));
        intervals.delete(name);
        console.log(`🛑 Stopped scheduled task: ${name}`);
    }
}

/**
 * Stop all scheduled tasks
 */
export function stopAllTasks() {
    for (const [name, intervalId] of intervals) {
        clearInterval(intervalId);
        console.log(`🛑 Stopped scheduled task: ${name}`);
    }
    intervals.clear();
}

/**
 * Start all scheduled tasks for the application
 */
export function startAllScheduledTasks() {
    console.log('🚀 Starting scheduled tasks...');
    
    // Schedule pending request reminders to run every hour (3600000 ms)
    scheduleTask('pending-request-reminders', sendPendingRequestReminders, 3600000);
    
    // Add more scheduled tasks here as needed
    // Example:
    // scheduleTask('daily-backup', performDailyBackup, 86400000); // Run daily
}

export default {
    scheduleTask,
    stopTask,
    stopAllTasks,
    startAllScheduledTasks
};
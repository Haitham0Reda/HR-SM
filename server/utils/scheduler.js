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

            await task();
        } catch (error) {

        }
    }, interval);
    
    // Store the interval ID
    intervals.set(name, intervalId);

}

/**
 * Stop a scheduled task
 * @param {string} name - Name of the task to stop
 */
export function stopTask(name) {
    if (intervals.has(name)) {
        clearInterval(intervals.get(name));
        intervals.delete(name);

    }
}

/**
 * Stop all scheduled tasks
 */
export function stopAllTasks() {
    for (const [name, intervalId] of intervals) {
        clearInterval(intervalId);

    }
    intervals.clear();
}

/**
 * Start all scheduled tasks for the application
 */
export function startAllScheduledTasks() {

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
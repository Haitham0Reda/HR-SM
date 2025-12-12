import fs from 'fs/promises';
import path from 'path';

export const deleteFile = async (filePath) => {
    try {
        await fs.unlink(filePath);
        return { success: true };
    } catch (error) {
        console.error('Error deleting file:', error);
        return { success: false, error: error.message };
    }
};

export const ensureDirectoryExists = async (dirPath) => {
    try {
        await fs.mkdir(dirPath, { recursive: true });
        return { success: true };
    } catch (error) {
        console.error('Error creating directory:', error);
        return { success: false, error: error.message };
    }
};

export const getFileSize = async (filePath) => {
    try {
        const stats = await fs.stat(filePath);
        return { success: true, size: stats.size };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export default { deleteFile, ensureDirectoryExists, getFileSize };

/**
 * Utility functions for handling profile pictures
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const SERVER_BASE_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

/**
 * Get the full URL for a profile picture
 * @param {string} profilePicture - The profile picture path or URL
 * @returns {string} - The full URL for the profile picture
 */
export const getProfilePictureUrl = (profilePicture) => {
    if (!profilePicture) return '';
    
    // Convert to string in case it's not a string
    const picUrl = String(profilePicture);
    
    // If it's already a full URL (starts with http), return as is
    if (picUrl.startsWith('http')) {
        return picUrl;
    }
    
    // If it's a base64 data URL, return as is
    if (picUrl.startsWith('data:')) {
        return picUrl;
    }
    
    // If it starts with /uploads, prepend the server base URL (not API URL)
    if (picUrl.startsWith('/uploads')) {
        return `${SERVER_BASE_URL}${picUrl}`;
    }
    
    // If it's just a filename, assume it's in the uploads/profile-pictures directory
    if (!picUrl.startsWith('/')) {
        return `${SERVER_BASE_URL}/uploads/profile-pictures/${picUrl}`;
    }
    
    // Default case: prepend server base URL
    return `${SERVER_BASE_URL}${picUrl}`;
};

/**
 * Get profile picture from user object with fallbacks
 * @param {object} user - The user object
 * @returns {string} - The profile picture URL
 */
export const getUserProfilePicture = (user) => {
    const profilePicture = user?.personalInfo?.profilePicture || 
                          user?.profilePicture || 
                          user?.profile?.profilePicture || 
                          user?.avatar || 
                          user?.photo;
    
    return getProfilePictureUrl(profilePicture);
};

/**
 * Get user initials for avatar fallback
 * @param {object} user - The user object
 * @returns {string} - The user initials
 */
export const getUserInitials = (user) => {
    const name = user?.personalInfo?.fullName || 
                 user?.name || 
                 user?.username || 
                 user?.personalInfo?.firstName;
    
    if (!name) return 'U';
    
    return name.charAt(0).toUpperCase();
};
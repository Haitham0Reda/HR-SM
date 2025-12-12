/**
 * Cookie management utilities using js-cookie
 * Provides secure cookie operations
 */
import Cookies from 'js-cookie';

/**
 * Cookie configuration
 */
const defaultOptions = {
    expires: 7, // 7 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
};

/**
 * Set a cookie
 */
export const setCookie = (name, value, options = {}) => {
    try {
        Cookies.set(name, value, { ...defaultOptions, ...options });
        return true;
    } catch (error) {

        return false;
    }
};

/**
 * Get a cookie
 */
export const getCookie = (name) => {
    try {
        return Cookies.get(name);
    } catch (error) {

        return null;
    }
};

/**
 * Remove a cookie
 */
export const removeCookie = (name) => {
    try {
        Cookies.remove(name);
        return true;
    } catch (error) {

        return false;
    }
};

/**
 * Get all cookies
 */
export const getAllCookies = () => {
    try {
        return Cookies.get();
    } catch (error) {

        return {};
    }
};

/**
 * Set authentication token
 */
export const setAuthToken = (token, remember = false) => {
    const options = remember ? { expires: 30 } : { expires: 1 };
    return setCookie('authToken', token, options);
};

/**
 * Get authentication token
 */
export const getAuthToken = () => {
    return getCookie('authToken');
};

/**
 * Remove authentication token
 */
export const removeAuthToken = () => {
    return removeCookie('authToken');
};

/**
 * Set user preferences
 */
export const setUserPreferences = (preferences) => {
    return setCookie('userPreferences', JSON.stringify(preferences), { expires: 365 });
};

/**
 * Get user preferences
 */
export const getUserPreferences = () => {
    const prefs = getCookie('userPreferences');
    try {
        return prefs ? JSON.parse(prefs) : null;
    } catch (error) {

        return null;
    }
};

/**
 * Set theme preference
 */
export const setThemePreference = (theme) => {
    return setCookie('theme', theme, { expires: 365 });
};

/**
 * Get theme preference
 */
export const getThemePreference = () => {
    return getCookie('theme') || 'light';
};

/**
 * Set language preference
 */
export const setLanguagePreference = (language) => {
    return setCookie('language', language, { expires: 365 });
};

/**
 * Get language preference
 */
export const getLanguagePreference = () => {
    return getCookie('language') || 'en';
};

/**
 * Clear all app cookies
 */
export const clearAllAppCookies = () => {
    try {
        const cookies = getAllCookies();
        Object.keys(cookies).forEach(cookieName => {
            removeCookie(cookieName);
        });
        return true;
    } catch (error) {

        return false;
    }
};

export default {
    setCookie,
    getCookie,
    removeCookie,
    getAllCookies,
    setAuthToken,
    getAuthToken,
    removeAuthToken,
    setUserPreferences,
    getUserPreferences,
    setThemePreference,
    getThemePreference,
    setLanguagePreference,
    getLanguagePreference,
    clearAllAppCookies
};

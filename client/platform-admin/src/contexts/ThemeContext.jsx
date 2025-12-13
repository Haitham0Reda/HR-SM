import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import platformTheme from '../theme/platformTheme';

const ThemeContext = createContext();

export const useThemeConfig = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeConfig must be used within ThemeProvider');
    }
    return context;
};

// Alias for compatibility with existing code
export const useTheme = useThemeConfig;

export const ThemeProvider = ({ children }) => {
    const [colorMode, setColorMode] = useState(() => {
        // Load saved theme mode from localStorage
        const savedMode = localStorage.getItem('themeMode');
        return savedMode || 'light';
    });

    // Apply theme mode changes
    useEffect(() => {
        // Save theme mode to localStorage
        localStorage.setItem('themeMode', colorMode);
        
        // Set the color scheme on the document element for Material-UI CSS variables
        document.documentElement.setAttribute('data-mui-color-scheme', colorMode);
    }, [colorMode]);

    // Memoize the toggle function to prevent unnecessary re-renders
    const toggleColorMode = useCallback(() => {
        setColorMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
    }, []);

    // Memoize the change function
    const changeTheme = useCallback((mode) => {
        if (mode === 'light' || mode === 'dark') {
            setColorMode(mode);
        }
    }, []);

    // Get available themes (matching the interface expected by components)
    const getAvailableThemes = useCallback(() => {
        return ['light', 'dark'];
    }, []);

    // Memoize context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        theme: platformTheme,
        currentTheme: colorMode,
        colorMode,
        setColorMode,
        toggleColorMode,
        changeTheme,
        getAvailableThemes,
        loading: false,
        // Additional properties for compatibility
        themeConfig: null,
        setThemeConfig: () => {},
        resetTheme: () => setColorMode('light'),
        isCustomTheme: false,
    }), [colorMode, toggleColorMode, changeTheme, getAvailableThemes]);

    return (
        <ThemeContext.Provider value={value}>
            <MuiThemeProvider theme={platformTheme}>
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
};

export default ThemeContext;
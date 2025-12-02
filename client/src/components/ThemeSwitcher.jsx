import * as React from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useThemeConfig } from '../context/ThemeContext';

/**
 * ThemeSwitcher Component
 * 
 * Provides a toggle button to switch between light and dark theme modes.
 * Theme preference is automatically persisted to localStorage.
 * 
 * Features:
 * - Smooth transitions between theme modes
 * - Persistent theme preference via localStorage
 * - Accessible with proper ARIA labels
 * - Tooltip for better UX
 */
export default function ThemeSwitcher() {
    const { colorMode, setColorMode } = useThemeConfig();

    const toggleMode = () => {
        const newMode = colorMode === 'dark' ? 'light' : 'dark';
        setColorMode(newMode);
    };

    const isDark = colorMode === 'dark';

    return (
        <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`} enterDelay={1000}>
            <IconButton
                size="small"
                aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                onClick={toggleMode}
                sx={{
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                        transform: 'rotate(20deg)',
                    },
                }}
            >
                {isDark ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
        </Tooltip>
    );
}
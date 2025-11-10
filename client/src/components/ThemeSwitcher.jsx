import * as React from 'react';
import { useColorScheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

export default function ThemeSwitcher() {
    const { mode, setMode } = useColorScheme();

    const toggleMode = () => {
        setMode(mode === 'dark' ? 'light' : 'dark');
    };

    const isDark = mode === 'dark';

    return (
        <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`} enterDelay={1000}>
            <IconButton
                size="small"
                aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                onClick={toggleMode}
            >
                {isDark ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
        </Tooltip>
    );
}
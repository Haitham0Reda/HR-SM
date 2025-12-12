import * as React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const defaultThemeOptions = {
    palette: {
        primary: { main: '#1976d2' },
        secondary: { main: '#dc004e' },
    },
};

export default function AppTheme({ children, themeComponents = {}, ...props }) {
    const theme = createTheme({
        ...defaultThemeOptions,
        components: themeComponents,
    });
    return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

import { createTheme } from '@mui/material/styles';

// Create Material-UI theme with color scheme support
const theme = createTheme({
    cssVariables: {
        colorSchemeSelector: 'data-mui-color-scheme',
    },
    colorSchemes: {
        light: {
            palette: {
                primary: {
                    main: '#2563eb',
                    light: '#60a5fa',
                    dark: '#1e40af',
                    contrastText: '#ffffff',
                },
                secondary: {
                    main: '#7c3aed',
                    light: '#a78bfa',
                    dark: '#5b21b6',
                    contrastText: '#ffffff',
                },
                success: {
                    main: '#10b981',
                    light: '#34d399',
                    dark: '#059669',
                    contrastText: '#ffffff',
                },
                error: {
                    main: '#ef4444',
                    light: '#f87171',
                    dark: '#dc2626',
                    contrastText: '#ffffff',
                },
                warning: {
                    main: '#f59e0b',
                    light: '#fbbf24',
                    dark: '#d97706',
                    contrastText: '#ffffff',
                },
                info: {
                    main: '#3b82f6',
                    light: '#60a5fa',
                    dark: '#2563eb',
                    contrastText: '#ffffff',
                },
                background: {
                    default: '#f8fafc',
                    paper: '#ffffff',
                },
                text: {
                    primary: '#0f172a',
                    secondary: '#64748b',
                },
                divider: '#e2e8f0',
            },
        },
        dark: {
            palette: {
                primary: {
                    main: '#60a5fa',
                    light: '#93c5fd',
                    dark: '#3b82f6',
                    contrastText: '#0f172a',
                },
                secondary: {
                    main: '#a78bfa',
                    light: '#c4b5fd',
                    dark: '#8b5cf6',
                    contrastText: '#0f172a',
                },
                success: {
                    main: '#34d399',
                    light: '#6ee7b7',
                    dark: '#10b981',
                    contrastText: '#0f172a',
                },
                error: {
                    main: '#f87171',
                    light: '#fca5a5',
                    dark: '#ef4444',
                    contrastText: '#0f172a',
                },
                warning: {
                    main: '#fbbf24',
                    light: '#fcd34d',
                    dark: '#f59e0b',
                    contrastText: '#0f172a',
                },
                info: {
                    main: '#60a5fa',
                    light: '#93c5fd',
                    dark: '#3b82f6',
                    contrastText: '#0f172a',
                },
                background: {
                    default: '#0f172a',
                    paper: '#1e293b',
                },
                text: {
                    primary: '#f1f5f9',
                    secondary: '#94a3b8',
                },
                divider: '#334155',
            },
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontSize: '2.5rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
        },
        h2: {
            fontSize: '2rem',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
        },
        h3: {
            fontSize: '1.75rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
        },
        h4: {
            fontSize: '1.5rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            lineHeight: 1.4,
        },
        h5: {
            fontSize: '1.25rem',
            fontWeight: 600,
            lineHeight: 1.4,
        },
        h6: {
            fontSize: '1rem',
            fontWeight: 600,
            lineHeight: 1.5,
        },
        body1: {
            fontSize: '1rem',
            lineHeight: 1.6,
        },
        body2: {
            fontSize: '0.875rem',
            lineHeight: 1.6,
        },
        button: {
            fontWeight: 500,
            letterSpacing: '0.02em',
        },
    },
    shape: {
        borderRadius: 12,
    },
    spacing: 8,
    shadows: [
        'none',
        '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    ],
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 8,
                    fontWeight: 500,
                    padding: '8px 16px',
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                    },
                },
                contained: {
                    '&:hover': {
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                    },
                },
                sizeLarge: {
                    padding: '12px 24px',
                    fontSize: '1rem',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                    border: '1px solid',
                    borderColor: 'var(--mui-palette-divider)',
                },
            },
        },
        MuiCardContent: {
            styleOverrides: {
                root: {
                    padding: '24px',
                    '&:last-child': {
                        paddingBottom: '24px',
                    },
                },
            },
        },
        MuiTextField: {
            defaultProps: {
                variant: 'outlined',
            },
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8,
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
                elevation1: {
                    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                },
                elevation2: {
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    boxShadow: 'none',
                    borderBottom: '1px solid',
                    borderColor: 'var(--mui-palette-divider)',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    borderRight: '1px solid',
                    borderColor: 'var(--mui-palette-divider)',
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    fontWeight: 500,
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottom: '1px solid',
                    borderColor: 'var(--mui-palette-divider)',
                },
                head: {
                    fontWeight: 600,
                    backgroundColor: 'var(--mui-palette-background-default)',
                },
            },
        },
        MuiAvatar: {
            styleOverrides: {
                root: {
                    fontWeight: 600,
                },
            },
        },
    },
});

export default theme;

// Additional customizations for specific components
export const dataGridCustomizations = {};
export const datePickersCustomizations = {};
export const sidebarCustomizations = {};
export const formInputCustomizations = {};
export const customizations = {
    borderRadius: 8,
    spacing: 4,
};

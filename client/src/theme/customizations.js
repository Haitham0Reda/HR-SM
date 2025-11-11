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
                    main: '#007bff', // Vibrant Blue - Main actions, navigation, branding
                    light: '#4da3ff',
                    dark: '#0056b3',
                    contrastText: '#ffffff',
                },
                secondary: {
                    main: '#6c757d', // Muted Gray - Subtle elements, secondary buttons
                    light: '#9ca3a8',
                    dark: '#495057',
                    contrastText: '#ffffff',
                },
                success: {
                    main: '#28a745', // Medium Green - Success indicators, approvals
                    light: '#5cb85c',
                    dark: '#1e7e34',
                    contrastText: '#ffffff',
                },
                error: {
                    main: '#dc3545', // Deep Red - Alerts, errors, deletions
                    light: '#e4606d',
                    dark: '#bd2130',
                    contrastText: '#ffffff',
                },
                warning: {
                    main: '#ffc107', // Amber - Warnings, pending states
                    light: '#ffcd39',
                    dark: '#d39e00',
                    contrastText: '#212529',
                },
                info: {
                    main: '#17a2b8', // Teal - Informational messages
                    light: '#45b5c6',
                    dark: '#117a8b',
                    contrastText: '#ffffff',
                },
                background: {
                    default: '#f8f9fa', // Very Light Gray - Main content area
                    paper: '#ffffff',
                },
                text: {
                    primary: '#212529', // Dark Charcoal - Main body text
                    secondary: '#6c757d', // Muted Gray - Secondary text
                },
                divider: '#dee2e6',
            },
        },
        dark: {
            palette: {
                primary: {
                    main: '#4da3ff', // Lighter blue for dark mode
                    light: '#80bdff',
                    dark: '#007bff',
                    contrastText: '#ffffff',
                },
                secondary: {
                    main: '#9ca3a8', // Lighter gray for dark mode
                    light: '#c1c6ca',
                    dark: '#6c757d',
                    contrastText: '#ffffff',
                },
                success: {
                    main: '#5cb85c', // Lighter green for dark mode
                    light: '#7ec87e',
                    dark: '#28a745',
                    contrastText: '#ffffff',
                },
                error: {
                    main: '#e4606d', // Lighter red for dark mode
                    light: '#ea8089',
                    dark: '#dc3545',
                    contrastText: '#ffffff',
                },
                warning: {
                    main: '#ffcd39', // Lighter amber for dark mode
                    light: '#ffd966',
                    dark: '#ffc107',
                    contrastText: '#212529',
                },
                info: {
                    main: '#45b5c6', // Lighter teal for dark mode
                    light: '#6dc5d3',
                    dark: '#17a2b8',
                    contrastText: '#ffffff',
                },
                background: {
                    default: '#1a1d23', // Dark background
                    paper: '#25282e', // Slightly lighter for cards
                },
                text: {
                    primary: '#f8f9fa', // Light text
                    secondary: '#adb5bd', // Muted light text
                },
                divider: '#495057',
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

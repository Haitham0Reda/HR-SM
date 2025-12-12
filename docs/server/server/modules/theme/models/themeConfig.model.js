import mongoose from 'mongoose';

const colorSchemeSchema = new mongoose.Schema({
    main: { type: String, required: true },
    light: { type: String, required: true },
    dark: { type: String, required: true },
}, { _id: false });

const backgroundSchema = new mongoose.Schema({
    default: { type: String, required: true },
    paper: { type: String, required: true },
}, { _id: false });

const textSchema = new mongoose.Schema({
    primary: { type: String, required: true },
    secondary: { type: String, required: true },
}, { _id: false });

const paletteSchema = new mongoose.Schema({
    primary: colorSchemeSchema,
    secondary: colorSchemeSchema,
    success: colorSchemeSchema,
    error: colorSchemeSchema,
    warning: colorSchemeSchema,
    info: colorSchemeSchema,
    background: backgroundSchema,
    text: textSchema,
}, { _id: false });

const themeConfigSchema = new mongoose.Schema({
    // Color schemes for light and dark modes
    light: {
        type: paletteSchema,
        required: true,
    },
    dark: {
        type: paletteSchema,
        required: true,
    },

    // Typography settings
    typography: {
        fontFamily: {
            type: String,
            default: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        },
        fontSize: {
            type: Number,
            default: 14,
            min: 12,
            max: 18,
        },
    },

    // Shape settings
    shape: {
        borderRadius: {
            type: Number,
            default: 12,
            min: 0,
            max: 24,
        },
    },

    // Spacing
    spacing: {
        type: Number,
        default: 8,
        min: 4,
        max: 16,
    },

    // Metadata
    isActive: {
        type: Boolean,
        default: true,
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
});

// Ensure only one active configuration exists
themeConfigSchema.statics.getActiveTheme = async function () {
    let theme = await this.findOne({ isActive: true });
    if (!theme) {
        // Create default theme if none exists
        theme = await this.create({
            light: {
                primary: { main: '#007bff', light: '#4da3ff', dark: '#0056b3' },
                secondary: { main: '#6c757d', light: '#9ca3a8', dark: '#495057' },
                success: { main: '#28a745', light: '#5cb85c', dark: '#1e7e34' },
                error: { main: '#dc3545', light: '#e4606d', dark: '#bd2130' },
                warning: { main: '#ffc107', light: '#ffcd39', dark: '#d39e00' },
                info: { main: '#17a2b8', light: '#45b5c6', dark: '#117a8b' },
                background: { default: '#f8f9fa', paper: '#ffffff' },
                text: { primary: '#212529', secondary: '#6c757d' },
            },
            dark: {
                primary: { main: '#4da3ff', light: '#80bdff', dark: '#007bff' },
                secondary: { main: '#9ca3a8', light: '#c1c6ca', dark: '#6c757d' },
                success: { main: '#5cb85c', light: '#7ec87e', dark: '#28a745' },
                error: { main: '#e4606d', light: '#ea8089', dark: '#dc3545' },
                warning: { main: '#ffcd39', light: '#ffd966', dark: '#ffc107' },
                info: { main: '#45b5c6', light: '#6dc5d3', dark: '#17a2b8' },
                background: { default: '#1a1d23', paper: '#25282e' },
                text: { primary: '#f8f9fa', secondary: '#adb5bd' },
            },
            typography: {
                fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                fontSize: 14,
            },
            shape: {
                borderRadius: 12,
            },
            spacing: 8,
            isActive: true,
        });
    }
    return theme;
};

export default mongoose.model('ThemeConfig', themeConfigSchema);

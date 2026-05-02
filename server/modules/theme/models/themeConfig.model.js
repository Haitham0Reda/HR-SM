import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const ThemeConfig = mainAppDb.define('ThemeConfig', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tenantId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'tenant_id',
        comment: 'Tenant identifier for multi-tenancy'
    },
    // Color schemes stored as JSONB for flexibility
    light: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            primary: { main: '#007bff', light: '#4da3ff', dark: '#0056b3' },
            secondary: { main: '#6c757d', light: '#9ca3a8', dark: '#495057' },
            success: { main: '#28a745', light: '#5cb85c', dark: '#1e7e34' },
            error: { main: '#dc3545', light: '#e4606d', dark: '#bd2130' },
            warning: { main: '#ffc107', light: '#ffcd39', dark: '#d39e00' },
            info: { main: '#17a2b8', light: '#45b5c6', dark: '#117a8b' },
            background: { default: '#f8f9fa', paper: '#ffffff' },
            text: { primary: '#212529', secondary: '#6c757d' }
        }
    },
    dark: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            primary: { main: '#4da3ff', light: '#80bdff', dark: '#007bff' },
            secondary: { main: '#9ca3a8', light: '#c1c6ca', dark: '#6c757d' },
            success: { main: '#5cb85c', light: '#7ec87e', dark: '#28a745' },
            error: { main: '#e4606d', light: '#ea8089', dark: '#dc3545' },
            warning: { main: '#ffcd39', light: '#ffd966', dark: '#ffc107' },
            info: { main: '#45b5c6', light: '#6dc5d3', dark: '#17a2b8' },
            background: { default: '#1a1d23', paper: '#25282e' },
            text: { primary: '#f8f9fa', secondary: '#adb5bd' }
        }
    },
    // Typography settings stored as JSONB
    typography: {
        type: DataTypes.JSONB,
        defaultValue: {
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            fontSize: 14
        },
        validate: {
            isValidTypography(value) {
                if (value.fontSize && (value.fontSize < 12 || value.fontSize > 18)) {
                    throw new Error('Font size must be between 12 and 18');
                }
            }
        }
    },
    // Shape settings stored as JSONB
    shape: {
        type: DataTypes.JSONB,
        defaultValue: {
            borderRadius: 12
        },
        validate: {
            isValidShape(value) {
                if (value.borderRadius && (value.borderRadius < 0 || value.borderRadius > 24)) {
                    throw new Error('Border radius must be between 0 and 24');
                }
            }
        }
    },
    // Spacing
    spacing: {
        type: DataTypes.INTEGER,
        defaultValue: 8,
        validate: {
            min: 4,
            max: 16
        }
    },
    // Metadata
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    },
    updatedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'updated_by',
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'theme_configs',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['tenant_id']
        },
        {
            fields: ['tenant_id', 'is_active']
        }
    ]
});

// Static method to get active theme
ThemeConfig.getActiveTheme = async function(tenantId) {
    let theme = await this.findOne({ 
        where: { 
            tenantId,
            isActive: true 
        } 
    });
    
    if (!theme) {
        // Create default theme if none exists
        theme = await this.create({
            tenantId,
            light: {
                primary: { main: '#007bff', light: '#4da3ff', dark: '#0056b3' },
                secondary: { main: '#6c757d', light: '#9ca3a8', dark: '#495057' },
                success: { main: '#28a745', light: '#5cb85c', dark: '#1e7e34' },
                error: { main: '#dc3545', light: '#e4606d', dark: '#bd2130' },
                warning: { main: '#ffc107', light: '#ffcd39', dark: '#d39e00' },
                info: { main: '#17a2b8', light: '#45b5c6', dark: '#117a8b' },
                background: { default: '#f8f9fa', paper: '#ffffff' },
                text: { primary: '#212529', secondary: '#6c757d' }
            },
            dark: {
                primary: { main: '#4da3ff', light: '#80bdff', dark: '#007bff' },
                secondary: { main: '#9ca3a8', light: '#c1c6ca', dark: '#6c757d' },
                success: { main: '#5cb85c', light: '#7ec87e', dark: '#28a745' },
                error: { main: '#e4606d', light: '#ea8089', dark: '#dc3545' },
                warning: { main: '#ffcd39', light: '#ffd966', dark: '#ffc107' },
                info: { main: '#45b5c6', light: '#6dc5d3', dark: '#17a2b8' },
                background: { default: '#1a1d23', paper: '#25282e' },
                text: { primary: '#f8f9fa', secondary: '#adb5bd' }
            },
            typography: {
                fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                fontSize: 14
            },
            shape: {
                borderRadius: 12
            },
            spacing: 8,
            isActive: true
        });
    }
    return theme;
};

export default ThemeConfig;





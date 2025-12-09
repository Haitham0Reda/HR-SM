import React from 'react';
import { 
  Card, 
  CardContent, 
  Box, 
  Typography, 
  Avatar, 
  IconButton, 
  Chip,
  Tooltip 
} from '@mui/material';
import { Edit, Delete, Visibility } from '@mui/icons-material';
import { designTokens } from '../../theme/designTokens';

/**
 * UserCard Component
 * 
 * Displays user information in a card format with avatar, details, and action buttons.
 * 
 * @param {Object} props
 * @param {Object} props.user - User object containing user information
 * @param {string} props.user.id - User ID
 * @param {string} props.user.name - User's full name
 * @param {string} props.user.email - User's email address
 * @param {string} props.user.role - User's role
 * @param {string} [props.user.avatar] - URL to user's avatar image
 * @param {string} [props.user.status] - User's status (active, inactive, pending)
 * @param {Function} [props.onEdit] - Callback when edit button is clicked
 * @param {Function} [props.onDelete] - Callback when delete button is clicked
 * @param {Function} [props.onView] - Callback when view button is clicked
 * @param {Object} [props.sx] - Additional MUI sx prop for styling
 */
const UserCard = ({
  user,
  onEdit,
  onDelete,
  onView,
  sx = {}
}) => {
  const getRoleColor = (role) => {
    const roleColors = {
      admin: 'error',
      manager: 'warning',
      employee: 'primary',
      hr: 'info',
    };
    return roleColors[role?.toLowerCase()] || 'default';
  };

  const getStatusColor = (status) => {
    const statusColors = {
      active: 'success',
      inactive: 'default',
      pending: 'warning',
    };
    return statusColors[status?.toLowerCase()] || 'default';
  };

  const getAvatarBorderColor = (role) => {
    const roleColors = {
      admin: 'error.main',
      manager: 'warning.main',
      employee: 'primary.main',
      hr: 'info.main',
    };
    return roleColors[role?.toLowerCase()] || 'primary.main';
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: designTokens.borderRadius.lg,
        border: `1px solid`,
        borderColor: 'divider',
        transition: `box-shadow ${designTokens.transitions.duration.standard}ms ${designTokens.transitions.easing.easeInOut}, transform ${designTokens.transitions.duration.standard}ms ${designTokens.transitions.easing.easeInOut}`,
        '&:hover': {
          boxShadow: designTokens.shadows.md,
          transform: 'translateY(-2px)',
        },
        ...sx
      }}
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, p: 3 }}>
        {/* Avatar and Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={user.avatar}
            alt={user.name}
            sx={{
              width: 64,
              height: 64,
              border: `3px solid`,
              borderColor: getAvatarBorderColor(user.role),
              fontSize: designTokens.typography.fontSize.lg,
              fontWeight: designTokens.typography.fontWeight.semibold,
            }}
          >
            {!user.avatar && getInitials(user.name)}
          </Avatar>
          
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h6"
              component="h3"
              sx={{
                fontWeight: designTokens.typography.fontWeight.semibold,
                fontSize: designTokens.typography.fontSize.md,
                mb: 0.5,
              }}
            >
              {user.name}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: designTokens.typography.fontSize.sm,
                wordBreak: 'break-word',
              }}
            >
              {user.email}
            </Typography>
          </Box>
        </Box>

        {/* Role and Status Chips */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={user.role}
            color={getRoleColor(user.role)}
            size="small"
            sx={{
              fontWeight: designTokens.typography.fontWeight.medium,
              fontSize: designTokens.typography.fontSize.xs,
              textTransform: 'capitalize',
            }}
          />
          {user.status && (
            <Chip
              label={user.status}
              color={getStatusColor(user.status)}
              size="small"
              variant="outlined"
              sx={{
                fontWeight: designTokens.typography.fontWeight.medium,
                fontSize: designTokens.typography.fontSize.xs,
                textTransform: 'capitalize',
              }}
            />
          )}
        </Box>

        {/* Action Buttons */}
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 1, 
            mt: 'auto',
            pt: 2,
            borderTop: `1px solid`,
            borderColor: 'divider',
          }}
        >
          {onView && (
            <Tooltip title="View Details">
              <IconButton
                size="small"
                onClick={() => onView(user)}
                sx={{
                  color: 'primary.main',
                  '&:hover': {
                    bgcolor: 'primary.light',
                  },
                }}
              >
                <Visibility fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onEdit && (
            <Tooltip title="Edit User">
              <IconButton
                size="small"
                onClick={() => onEdit(user)}
                sx={{
                  color: 'info.main',
                  '&:hover': {
                    bgcolor: 'info.light',
                  },
                }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="Delete User">
              <IconButton
                size="small"
                onClick={() => onDelete(user)}
                sx={{
                  color: 'error.main',
                  '&:hover': {
                    bgcolor: 'error.light',
                  },
                }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default UserCard;

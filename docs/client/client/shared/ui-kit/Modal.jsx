/**
 * Standardized Modal Component
 * 
 * A wrapper around MUI Dialog with consistent styling and sizes.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Design tokens - can be customized per app
const defaultDesignTokens = {
  spacing: {
    sm: '8px',
    md: '16px',
    lg: '24px',
  },
  typography: {
    fontSize: {
      xl: '1.25rem',
    },
    fontWeight: {
      semibold: 600,
    },
  },
  borderRadius: {
    lg: '12px',
  },
  shadows: {
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
};

const Modal = ({
  open,
  onClose,
  title,
  children,
  actions,
  size = 'medium',
  showCloseButton = true,
  designTokens = defaultDesignTokens,
  sx = {},
  ...props
}) => {
  const sizeMap = {
    small: 'sm',
    medium: 'md',
    large: 'lg',
    xlarge: 'xl',
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={sizeMap[size]}
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: designTokens.borderRadius.lg,
          boxShadow: designTokens.shadows.xl,
          ...sx,
        },
      }}
      {...props}
    >
      {title && (
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: designTokens.typography.fontWeight.semibold,
            fontSize: designTokens.typography.fontSize.xl,
            padding: designTokens.spacing.lg,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" component="span">
            {title}
          </Typography>
          {showCloseButton && (
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
      )}
      
      <DialogContent
        sx={{
          padding: designTokens.spacing.lg,
        }}
      >
        {children}
      </DialogContent>
      
      {actions && (
        <DialogActions
          sx={{
            padding: designTokens.spacing.lg,
            paddingTop: designTokens.spacing.md,
            borderTop: '1px solid',
            borderColor: 'divider',
            gap: designTokens.spacing.sm,
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
};

Modal.propTypes = {
  /** Modal open state */
  open: PropTypes.bool.isRequired,
  
  /** Close handler */
  onClose: PropTypes.func.isRequired,
  
  /** Modal title */
  title: PropTypes.node,
  
  /** Modal content */
  children: PropTypes.node.isRequired,
  
  /** Action buttons */
  actions: PropTypes.node,
  
  /** Modal size */
  size: PropTypes.oneOf(['small', 'medium', 'large', 'xlarge']),
  
  /** Show close button */
  showCloseButton: PropTypes.bool,
  
  /** Design tokens for theming */
  designTokens: PropTypes.object,
  
  /** Custom styles */
  sx: PropTypes.object,
};

export default Modal;

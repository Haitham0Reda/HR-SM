/**
 * FormPage Template
 * 
 * A reusable template for create/edit pages with form sections and validation.
 * 
 * Features:
 * - Consistent layout structure
 * - Form sections with validation
 * - Save/cancel actions
 * - Loading and error states
 * - Unsaved changes warning
 * - Responsive design
 * 
 * Usage:
 * ```jsx
 * <FormPage
 *   title="Create User"
 *   sections={sections}
 *   onSubmit={handleSubmit}
 *   onCancel={handleCancel}
 *   loading={loading}
 * />
 * ```
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Breadcrumbs,
  Link,
  Alert,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { spacing } from '../../theme/designTokens';
import { useNavigate } from 'react-router-dom';

const FormPage = ({
  title,
  subtitle,
  breadcrumbs = [],
  sections = [],
  onSubmit,
  onCancel,
  loading = false,
  error = null,
  success = null,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  showUnsavedWarning = true,
  actions,
}) => {
  const [isDirty, setIsDirty] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const navigate = useNavigate();

  // Track form changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && showUnsavedWarning) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, showUnsavedWarning]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (onSubmit) {
      await onSubmit(event);
      setIsDirty(false);
    }
  };

  const handleCancel = () => {
    if (isDirty && showUnsavedWarning) {
      setShowCancelDialog(true);
    } else {
      performCancel();
    }
  };

  const performCancel = () => {
    setShowCancelDialog(false);
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1);
    }
  };

  const handleFormChange = () => {
    if (!isDirty) {
      setIsDirty(true);
    }
  };

  return (
    <Box sx={{ padding: spacing(3) }}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <Breadcrumbs sx={{ marginBottom: spacing(2) }}>
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return isLast ? (
              <Typography key={index} color="text.primary">
                {crumb.label}
              </Typography>
            ) : (
              <Link
                key={index}
                underline="hover"
                color="inherit"
                href={crumb.path}
                onClick={(e) => {
                  e.preventDefault();
                  if (crumb.path) {
                    navigate(crumb.path);
                  }
                }}
                sx={{ cursor: 'pointer' }}
              >
                {crumb.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      )}

      {/* Header */}
      <Box sx={{ marginBottom: spacing(3) }}>
        <Typography variant="h4" gutterBottom>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ marginBottom: spacing(3) }}>
          {error}
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert severity="success" sx={{ marginBottom: spacing(3) }}>
          {success}
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} onChange={handleFormChange}>
        <Stack spacing={3}>
          {/* Form Sections */}
          {sections.map((section, index) => (
            <Card key={index}>
              <CardContent>
                {section.title && (
                  <>
                    <Typography variant="h6" gutterBottom>
                      {section.title}
                    </Typography>
                    {section.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ marginBottom: spacing(2) }}
                      >
                        {section.description}
                      </Typography>
                    )}
                    <Divider sx={{ marginBottom: spacing(3) }} />
                  </>
                )}
                {section.content}
              </CardContent>
            </Card>
          ))}

          {/* Action Buttons */}
          <Card>
            <CardContent>
              <Stack
                direction="row"
                spacing={2}
                justifyContent="flex-end"
                alignItems="center"
              >
                {actions}
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                  disabled={loading}
                >
                  {cancelLabel}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : submitLabel}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </form>

      {/* Unsaved Changes Dialog */}
      <Dialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
      >
        <DialogTitle>Unsaved Changes</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCancelDialog(false)}>
            Stay
          </Button>
          <Button onClick={performCancel} color="error" autoFocus>
            Leave
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

FormPage.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  breadcrumbs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      path: PropTypes.string,
    })
  ),
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string,
      description: PropTypes.string,
      content: PropTypes.node.isRequired,
    })
  ).isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  loading: PropTypes.bool,
  error: PropTypes.string,
  success: PropTypes.string,
  submitLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  showUnsavedWarning: PropTypes.bool,
  actions: PropTypes.node,
};

export default FormPage;

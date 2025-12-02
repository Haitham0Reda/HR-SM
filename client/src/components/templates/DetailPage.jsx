/**
 * DetailPage Template
 * 
 * A reusable template for detail/show pages with header actions and tabbed content.
 * 
 * Features:
 * - Consistent layout structure
 * - Header with title and actions
 * - Breadcrumb navigation
 * - Tabbed content sections
 * - Loading and error states
 * - Responsive design
 * 
 * Usage:
 * ```jsx
 * <DetailPage
 *   title="User Details"
 *   subtitle="John Doe"
 *   breadcrumbs={[{ label: 'Users', path: '/users' }, { label: 'Details' }]}
 *   tabs={tabs}
 *   actions={actions}
 *   loading={loading}
 * />
 * ```
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  IconButton,
  Breadcrumbs,
  Link,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { spacing } from '../../theme/designTokens';
import { useNavigate } from 'react-router-dom';

const DetailPage = ({
  title,
  subtitle,
  breadcrumbs = [],
  tabs = [],
  defaultTab = 0,
  actions,
  onEdit,
  onDelete,
  onBack,
  loading = false,
  error = null,
  headerContent,
  status,
  metadata = [],
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const navigate = useNavigate();

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ padding: spacing(3) }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

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
      <Card sx={{ marginBottom: spacing(3) }}>
        <CardContent>
          <Stack direction="row" alignItems="flex-start" spacing={2}>
            <IconButton onClick={handleBack} size="small">
              <ArrowBackIcon />
            </IconButton>

            <Box sx={{ flexGrow: 1 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Typography variant="h4">{title}</Typography>
                {status && (
                  <Chip
                    label={status.label}
                    color={status.color || 'default'}
                    size="small"
                  />
                )}
              </Stack>
              {subtitle && (
                <Typography variant="body2" color="text.secondary" sx={{ marginTop: spacing(0.5) }}>
                  {subtitle}
                </Typography>
              )}

              {/* Metadata */}
              {metadata.length > 0 && (
                <Stack
                  direction="row"
                  spacing={3}
                  sx={{ marginTop: spacing(2) }}
                  flexWrap="wrap"
                >
                  {metadata.map((item, index) => (
                    <Box key={index}>
                      <Typography variant="caption" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Typography variant="body2">{item.value}</Typography>
                    </Box>
                  ))}
                </Stack>
              )}

              {/* Custom Header Content */}
              {headerContent && (
                <Box sx={{ marginTop: spacing(2) }}>
                  {headerContent}
                </Box>
              )}
            </Box>

            {/* Actions */}
            <Stack direction="row" spacing={1}>
              {onEdit && (
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={onEdit}
                >
                  Edit
                </Button>
              )}
              {onDelete && (
                <IconButton onClick={onDelete} color="error">
                  <DeleteIcon />
                </IconButton>
              )}
              {actions}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Tabs */}
      {tabs.length > 0 && (
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label="detail page tabs"
            >
              {tabs.map((tab, index) => (
                <Tab
                  key={index}
                  label={tab.label}
                  icon={tab.icon}
                  iconPosition="start"
                  disabled={tab.disabled}
                />
              ))}
            </Tabs>
          </Box>

          {/* Tab Content */}
          {tabs.map((tab, index) => (
            <Box
              key={index}
              role="tabpanel"
              hidden={activeTab !== index}
              sx={{ padding: spacing(3) }}
            >
              {activeTab === index && tab.content}
            </Box>
          ))}
        </Card>
      )}
    </Box>
  );
};

DetailPage.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  breadcrumbs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      path: PropTypes.string,
    })
  ),
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      icon: PropTypes.node,
      content: PropTypes.node.isRequired,
      disabled: PropTypes.bool,
    })
  ),
  defaultTab: PropTypes.number,
  actions: PropTypes.node,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onBack: PropTypes.func,
  loading: PropTypes.bool,
  error: PropTypes.string,
  headerContent: PropTypes.node,
  status: PropTypes.shape({
    label: PropTypes.string.isRequired,
    color: PropTypes.oneOf(['default', 'primary', 'secondary', 'success', 'error', 'warning', 'info']),
  }),
  metadata: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.node.isRequired,
    })
  ),
};

export default DetailPage;

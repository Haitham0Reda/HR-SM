import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Tooltip,
  IconButton,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert
} from '@mui/material';
import {
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useApi } from '../contexts/ApiContext';
import realtimeService from '../services/realtimeService';

const ConnectionStatusIndicator = ({ variant = 'chip' }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [connectionHistory, setConnectionHistory] = useState([]);
  
  const { status, checkHealth, isHealthy } = useApi();

  useEffect(() => {
    // Subscribe to real-time connection status
    const unsubscribe = realtimeService.subscribe('connection', (connectionStatus) => {
      setRealtimeConnected(connectionStatus.connected);
      
      // Add to connection history
      const historyEntry = {
        timestamp: new Date(),
        connected: connectionStatus.connected,
        reason: connectionStatus.reason || (connectionStatus.connected ? 'Connected' : 'Disconnected'),
        reconnected: connectionStatus.reconnected || false
      };
      
      setConnectionHistory(prev => [historyEntry, ...prev.slice(0, 9)]); // Keep last 10 entries
    });

    return () => unsubscribe();
  }, []);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleRefreshAll = async () => {
    await checkHealth.platform();
    await checkHealth.licenseServer();
    realtimeService.requestMetricsUpdate();
  };

  const getOverallStatus = () => {
    if (!status.platform.connected || !status.licenseServer.connected) {
      return 'critical';
    }
    if (!realtimeConnected) {
      return 'warning';
    }
    if (status.platform.error || status.licenseServer.error) {
      return 'warning';
    }
    return 'healthy';
  };

  const getStatusColor = () => {
    const overallStatus = getOverallStatus();
    switch (overallStatus) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = () => {
    const overallStatus = getOverallStatus();
    switch (overallStatus) {
      case 'healthy':
        return <WifiIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'critical':
        return <WifiOffIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getStatusLabel = () => {
    const overallStatus = getOverallStatus();
    switch (overallStatus) {
      case 'healthy':
        return 'All Systems Operational';
      case 'warning':
        return 'Partial Connectivity';
      case 'critical':
        return 'Connection Issues';
      default:
        return 'Unknown';
    }
  };

  const open = Boolean(anchorEl);

  if (variant === 'icon') {
    return (
      <>
        <Tooltip title={getStatusLabel()}>
          <IconButton onClick={handleClick} color={getStatusColor()}>
            {getStatusIcon()}
          </IconButton>
        </Tooltip>
        
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <ConnectionStatusDetails
            status={status}
            realtimeConnected={realtimeConnected}
            connectionHistory={connectionHistory}
            onRefresh={handleRefreshAll}
            onClose={handleClose}
          />
        </Popover>
      </>
    );
  }

  return (
    <>
      <Chip
        icon={getStatusIcon()}
        label={getStatusLabel()}
        color={getStatusColor()}
        onClick={handleClick}
        variant="outlined"
        size="small"
      />
      
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <ConnectionStatusDetails
          status={status}
          realtimeConnected={realtimeConnected}
          connectionHistory={connectionHistory}
          onRefresh={handleRefreshAll}
          onClose={handleClose}
        />
      </Popover>
    </>
  );
};

const ConnectionStatusDetails = ({ status, realtimeConnected, connectionHistory, onRefresh, onClose }) => {
  return (
    <Box sx={{ p: 2, minWidth: 350, maxWidth: 400 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Connection Status
        </Typography>
        <IconButton size="small" onClick={onRefresh}>
          <RefreshIcon />
        </IconButton>
      </Box>

      <List dense>
        {/* Platform API Status */}
        <ListItem>
          <ListItemIcon>
            {status.platform.connected ? (
              <CheckCircleIcon color="success" />
            ) : (
              <ErrorIcon color="error" />
            )}
          </ListItemIcon>
          <ListItemText
            primary="Platform API"
            secondary={
              status.platform.connected
                ? `Connected - Last check: ${status.platform.lastCheck?.toLocaleTimeString()}`
                : `Disconnected - ${status.platform.error || 'Unknown error'}`
            }
          />
        </ListItem>

        {/* License Server Status */}
        <ListItem>
          <ListItemIcon>
            {status.licenseServer.connected ? (
              <CheckCircleIcon color="success" />
            ) : (
              <ErrorIcon color="error" />
            )}
          </ListItemIcon>
          <ListItemText
            primary="License Server"
            secondary={
              status.licenseServer.connected
                ? `Connected - Last check: ${status.licenseServer.lastCheck?.toLocaleTimeString()}`
                : `Disconnected - ${status.licenseServer.error || 'Unknown error'}`
            }
          />
        </ListItem>

        {/* Real-time Connection Status */}
        <ListItem>
          <ListItemIcon>
            {realtimeConnected ? (
              <CheckCircleIcon color="success" />
            ) : (
              <WarningIcon color="warning" />
            )}
          </ListItemIcon>
          <ListItemText
            primary="Real-time Updates"
            secondary={
              realtimeConnected
                ? 'WebSocket connected'
                : 'WebSocket disconnected - Attempting to reconnect'
            }
          />
        </ListItem>
      </List>

      {(status.platform.error || status.licenseServer.error || status.realtime.error) && (
        <>
          <Divider sx={{ my: 2 }} />
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Connection Issues Detected:
            </Typography>
            {status.platform.error && (
              <Typography variant="caption" display="block">
                • Platform: {status.platform.error}
              </Typography>
            )}
            {status.licenseServer.error && (
              <Typography variant="caption" display="block">
                • License Server: {status.licenseServer.error}
              </Typography>
            )}
            {status.realtime.error && (
              <Typography variant="caption" display="block">
                • Real-time: {status.realtime.error}
              </Typography>
            )}
          </Alert>
        </>
      )}

      {connectionHistory.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Recent Connection Events
          </Typography>
          <List dense>
            {connectionHistory.slice(0, 5).map((entry, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  {entry.connected ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : (
                    <ErrorIcon color="error" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={entry.reason}
                  secondary={entry.timestamp.toLocaleTimeString()}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Box>
  );
};

export default ConnectionStatusIndicator;
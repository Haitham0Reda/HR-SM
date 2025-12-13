import React from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';

// Test component to verify theme context is working
const ThemeTest = () => {
  // Try to use both theme contexts if available
  let hrThemeContext = null;
  let platformThemeContext = null;

  try {
    const { useThemeConfig } = require('../hr-app/src/context/ThemeContext');
    hrThemeContext = useThemeConfig();
  } catch (e) {
    // HR theme context not available
  }

  try {
    const { useTheme } = require('../platform-admin/src/contexts/ThemeContext');
    platformThemeContext = useTheme();
  } catch (e) {
    // Platform theme context not available
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Theme Context Test
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            HR App Theme Context
          </Typography>
          {hrThemeContext ? (
            <Box>
              <Typography variant="body2" color="success.main">
                ✅ HR Theme Context Available
              </Typography>
              <Typography variant="body2">
                Color Mode: {hrThemeContext.colorMode || 'Not available'}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="error.main">
              ❌ HR Theme Context Not Available
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Platform Admin Theme Context
          </Typography>
          {platformThemeContext ? (
            <Box>
              <Typography variant="body2" color="success.main">
                ✅ Platform Theme Context Available
              </Typography>
              <Typography variant="body2">
                Current Theme: {platformThemeContext.currentTheme || 'Not available'}
              </Typography>
              <Typography variant="body2">
                Color Mode: {platformThemeContext.colorMode || 'Not available'}
              </Typography>
              <Button 
                variant="outlined" 
                onClick={platformThemeContext.toggleColorMode}
                sx={{ mt: 1 }}
              >
                Toggle Theme
              </Button>
            </Box>
          ) : (
            <Typography variant="body2" color="error.main">
              ❌ Platform Theme Context Not Available
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Material-UI Theme Test
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="contained" color="primary">
              Primary Button
            </Button>
            <Button variant="contained" color="secondary">
              Secondary Button
            </Button>
            <Button variant="outlined">
              Outlined Button
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default {
  title: '9. Testing/Theme Context Test',
  component: ThemeTest,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = () => <ThemeTest />;
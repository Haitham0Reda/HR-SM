import React from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  Chip,
  Button
} from '@mui/material';
import { 
  Code as CodeIcon,
  Build as BuildIcon,
  Palette as PaletteIcon,
  Description as DescriptionIcon,
  PlayArrow as PlayArrowIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

export default {
  title: '! Welcome/Documentation',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Complete documentation and setup guide for the HR Management Platform Storybook.',
      },
    },
  },
  tags: ['autodocs'],
};

const CodeBlock = ({ children, language = 'bash' }) => (
  <Box sx={{ 
    bgcolor: 'grey.100', 
    p: 2, 
    borderRadius: 1, 
    fontFamily: 'monospace',
    fontSize: '0.875rem',
    overflow: 'auto',
    border: '1px solid',
    borderColor: 'divider'
  }}>
    <pre style={{ margin: 0 }}>{children}</pre>
  </Box>
);

export const Documentation = () => (
  <Box sx={{ p: 4, bgcolor: 'background.default', minHeight: '100vh' }}>
    {/* Header */}
    <Box sx={{ mb: 6 }}>
      <Typography variant="h3" gutterBottom sx={{ 
        display: 'flex', 
        alignItems: 'center',
        fontWeight: 700
      }}>
        <DescriptionIcon sx={{ mr: 2, color: 'primary.main' }} />
        Documentation & Setup Guide
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 800 }}>
        Complete guide for using, developing, and contributing to the HR Management Platform Storybook.
      </Typography>
    </Box>

    {/* Quick Start */}
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <PlayArrowIcon sx={{ mr: 1, color: 'success.main' }} />
          Quick Start
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Get Storybook running in development mode:
        </Typography>
        
        <Typography variant="h6" gutterBottom>From the root directory:</Typography>
        <CodeBlock>
{`npm run client
# or
npm run dev`}
        </CodeBlock>
        
        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>From the client directory:</Typography>
        <CodeBlock>
{`cd client
npm run storybook`}
        </CodeBlock>
        
        <Alert severity="info" sx={{ mt: 2 }}>
          Storybook will start on <strong>http://localhost:6006</strong>
        </Alert>
      </CardContent>
    </Card>

    {/* Applications */}
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Applications Included
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  HR Application (hr-app)
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Employee management components" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Dashboard widgets and templates" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Form components with validation" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="License management components" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Common UI components" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom color="secondary">
                  Platform Administration (platform-admin)
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Multi-tenant management" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Company administration interfaces" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Platform-level configuration" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Modern theme system" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="System monitoring components" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </CardContent>
    </Card>

    {/* Story Organization */}
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Story Organization
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Stories are organized into logical categories for easy navigation:
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 2 }}>
              <Chip label="Base Components" color="primary" sx={{ mb: 1 }} />
              <List dense>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText primary="Button, TextField, Card" secondary="Core UI building blocks" />
                </ListItem>
              </List>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 2 }}>
              <Chip label="Composite Components" color="secondary" sx={{ mb: 1 }} />
              <List dense>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText primary="StatCard, UserCard" secondary="Complex composed components" />
                </ListItem>
              </List>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 2 }}>
              <Chip label="Page Templates" color="success" sx={{ mb: 1 }} />
              <List dense>
                <ListItem sx={{ py: 0 }}>
                  <ListItemText primary="ListPage, FormPage" secondary="Complete page layouts" />
                </ListItem>
              </List>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>

    {/* Adding Stories */}
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <CodeIcon sx={{ mr: 1, color: 'info.main' }} />
          Adding New Stories
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create a new story file next to your component:
        </Typography>
        
        <CodeBlock language="jsx">
{`import React from 'react';
import MyComponent from './MyComponent';

export default {
  title: 'Category/MyComponent',
  component: MyComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {
    prop1: 'value1',
    prop2: 'value2',
  },
};

export const Variant = () => (
  <MyComponent prop1="different" prop2="values" />
);`}
        </CodeBlock>
      </CardContent>
    </Card>

    {/* Theme Support */}
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <PaletteIcon sx={{ mr: 1, color: 'warning.main' }} />
          Theme Support
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          All stories are wrapped with theme providers that support:
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'primary.main' }} />
                </ListItemIcon>
                <ListItemText primary="Light and dark mode support" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'secondary.main' }} />
                </ListItemIcon>
                <ListItemText primary="Design tokens access" />
              </ListItem>
            </List>
          </Grid>
          <Grid item xs={12} md={6}>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main' }} />
                </ListItemIcon>
                <ListItemText primary="Consistent styling" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'info.main' }} />
                </ListItemIcon>
                <ListItemText primary="Modern gradient system" />
              </ListItem>
            </List>
          </Grid>
        </Grid>
        
        <Alert severity="tip" sx={{ mt: 2 }}>
          Use the background switcher in the Storybook toolbar to test components in different themes.
        </Alert>
      </CardContent>
    </Card>

    {/* Building */}
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <BuildIcon sx={{ mr: 1, color: 'error.main' }} />
          Building for Production
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          To build a static version of Storybook for deployment:
        </Typography>
        
        <CodeBlock>
{`npm run build-storybook`}
        </CodeBlock>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Static files will be generated in the <code>storybook-static</code> directory.
        </Typography>
      </CardContent>
    </Card>
  </Box>
);

Documentation.parameters = {
  layout: 'fullscreen',
};
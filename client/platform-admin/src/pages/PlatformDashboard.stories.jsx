import React from 'react';
import { Box } from '@mui/material';
import PlatformDashboard from './PlatformDashboard';
import { ThemeProvider } from '../contexts/ThemeContext';

export default {
  title: '2. Platform Admin/Pages/Dashboard',
  component: PlatformDashboard,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Platform Administration Dashboard - Main overview page showing system metrics, company statistics, and health monitoring.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
          <Story />
        </Box>
      </ThemeProvider>
    ),
  ],
};

export const LightMode = () => <PlatformDashboard />;

export const DarkMode = () => (
  <Box sx={{ 
    minHeight: '100vh', 
    bgcolor: '#0f172a',
    '& *': {
      colorScheme: 'dark'
    }
  }}>
    <PlatformDashboard />
  </Box>
);

DarkMode.parameters = {
  backgrounds: { default: 'dark' },
  docs: {
    description: {
      story: 'Platform Dashboard in dark mode, matching the modern dark theme with proper contrast and visibility.',
    },
  },
};

export const WithMockData = () => {
  // Mock the services to show sample data
  const mockCompanyService = {
    getAllCompanies: () => Promise.resolve({
      data: {
        companies: [
          {
            sanitizedName: 'european_consulting_group',
            metadata: { name: 'European Consulting Group', industry: 'Consulting', isActive: true, modules: ['hr-core', 'attendance', 'requests'] },
            statistics: { users: 25, departments: 5 }
          },
          {
            sanitizedName: 'global_manufacturing_inc',
            metadata: { name: 'Global Manufacturing Inc', industry: 'Manufacturing', isActive: true, modules: ['hr-core', 'attendance'] },
            statistics: { users: 150, departments: 12 }
          },
          {
            sanitizedName: 'healthcare_plus',
            metadata: { name: 'Healthcare Plus', industry: 'Healthcare', isActive: true, modules: ['hr-core', 'requests', 'documents'] },
            statistics: { users: 75, departments: 8 }
          },
          {
            sanitizedName: 'techcorp_solutions',
            metadata: { name: 'TechCorp Solutions', industry: 'Technology', isActive: true, modules: ['hr-core', 'attendance', 'requests', 'documents'] },
            statistics: { users: 200, departments: 15 }
          },
          {
            sanitizedName: 'middle_east_trading_co',
            metadata: { name: 'Middle East Trading Co', industry: 'Trading', isActive: false, modules: ['hr-core'] },
            statistics: { users: 45, departments: 6 }
          }
        ]
      }
    })
  };

  const mockSystemService = {
    getHealth: () => Promise.resolve({
      data: {
        status: 'healthy',
        uptime: 86400,
        checks: {
          database: { status: 'healthy' },
          memory: { usagePercent: 65, heapUsed: 512, heapTotal: 1024 }
        }
      }
    })
  };

  // Override the services temporarily
  React.useEffect(() => {
    const originalCompanyService = require('../services/companyService').default;
    const originalSystemService = require('../services/systemService').default;
    
    // Mock the services
    Object.assign(originalCompanyService, mockCompanyService);
    Object.assign(originalSystemService, mockSystemService);
    
    return () => {
      // Restore original services (in a real app, you'd handle this differently)
    };
  }, []);

  return <PlatformDashboard />;
};

WithMockData.parameters = {
  docs: {
    description: {
      story: 'Platform Dashboard with mock data showing various companies, system health, and usage statistics.',
    },
  },
};
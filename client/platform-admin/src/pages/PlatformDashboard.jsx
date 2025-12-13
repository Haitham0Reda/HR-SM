import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  Avatar,
  Stack,
} from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  Storage as StorageIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Memory as MemoryIcon,
  Dashboard as DashboardIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import companyService from '../services/companyService';
import systemService from '../services/systemService';
import { useTheme } from '../contexts/ThemeContext';

const PlatformDashboard = () => {
  const { theme } = useTheme();
  const [dashboardData, setDashboardData] = useState({
    companies: [],
    systemHealth: null,
    totalUsers: 0,
    totalDepartments: 0,
    activeCompanies: 0,
    loading: true,
    error: null
  });

  useEffect(() => {
    loadDashboardData();
    // Refresh dashboard data every 2 minutes
    const interval = setInterval(loadDashboardData, 120000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, error: null }));

      // Load companies data with fallback
      let companies = [];
      let systemHealth = null;

      try {
        const companiesResponse = await companyService.getAllCompanies();
        console.log('Companies response:', companiesResponse); // Debug log
        companies = companiesResponse?.data?.companies || companiesResponse?.companies || [];
        
        // Ensure companies is always an array
        if (!Array.isArray(companies)) {
          console.warn('Companies is not an array:', companies);
          companies = [];
        }
      } catch (companyError) {
        console.warn('Failed to load companies:', companyError);
        companies = [];
      }

      // Load system health with fallback
      try {
        const healthResponse = await systemService.getHealth();
        systemHealth = healthResponse?.data || null;
      } catch (healthError) {
        console.warn('Failed to load system health:', healthError);
        systemHealth = { status: 'unknown', message: 'Health check failed' };
      }

      // Calculate aggregated statistics with defensive programming
      const safeCompanies = Array.isArray(companies) ? companies : [];
      
      const totalUsers = safeCompanies.reduce((sum, company) => {
        if (!company) return sum;
        const employees = company.usage?.employees || company.statistics?.users || 0;
        return sum + employees;
      }, 0);
      
      const totalDepartments = safeCompanies.reduce((sum, company) => {
        if (!company) return sum;
        const departments = company.usage?.departments || company.statistics?.departments || 0;
        return sum + departments;
      }, 0);
      
      const activeCompanies = safeCompanies.filter(company => {
        if (!company) return false;
        return company.status === 'active' || company.metadata?.isActive !== false;
      }).length;

      setDashboardData({
        companies: safeCompanies,
        systemHealth,
        totalUsers,
        totalDepartments,
        activeCompanies,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load dashboard data: ' + (error.response?.data?.message || error.message)
      }));
    }
  };

  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy': return 'success.main';
      case 'degraded': return 'warning.main';
      case 'unhealthy': return 'error.main';
      default: return 'text.secondary';
    }
  };

  const getHealthIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon color="success" />;
      case 'degraded': return <WarningIcon color="warning" />;
      case 'unhealthy': return <ErrorIcon color="error" />;
      default: return <CheckCircleIcon color="disabled" />;
    }
  };

  const getTopCompanies = () => {
    const companies = Array.isArray(dashboardData.companies) ? dashboardData.companies : [];
    return companies
      .filter(company => company) // Filter out null/undefined companies
      .sort((a, b) => {
        const aUsers = a.usage?.employees || a.statistics?.users || 0;
        const bUsers = b.usage?.employees || b.statistics?.users || 0;
        return bUsers - aUsers;
      })
      .slice(0, 5);
  };

  const getModuleUsage = () => {
    const moduleCount = {};
    const companies = Array.isArray(dashboardData.companies) ? dashboardData.companies : [];
    
    companies.forEach(company => {
      try {
        if (!company) return;
        
        // Get enabled modules from different possible sources
        let enabledModules = [];
        
        if (company.getEnabledModules && typeof company.getEnabledModules === 'function') {
          enabledModules = company.getEnabledModules();
        } else if (company.modules && typeof company.modules === 'object') {
          enabledModules = Object.entries(company.modules)
            .filter(([key, config]) => config && config.enabled)
            .map(([key]) => key);
        } else if (company.metadata?.modules && Array.isArray(company.metadata.modules)) {
          enabledModules = company.metadata.modules;
        }
        
        enabledModules.forEach(module => {
          moduleCount[module] = (moduleCount[module] || 0) + 1;
        });
      } catch (error) {
        console.warn('Error processing company modules:', error);
      }
    });
    
    return Object.entries(moduleCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8);
  };

  if (dashboardData.loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: { xs: 2, sm: 3, md: 4 }, 
      backgroundColor: 'background.default', 
      minHeight: '100vh',
      color: 'text.primary',
      maxWidth: '100%',
      overflow: 'hidden'
    }}>
      {/* Header Section */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 3, 
          mb: 3, 
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          borderRadius: 2
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ 
              bgcolor: 'rgba(255,255,255,0.2)', 
              width: { xs: 48, sm: 56 }, 
              height: { xs: 48, sm: 56 }
            }}>
              <DashboardIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />
            </Avatar>
            <Box>
              <Typography 
                variant="h5" 
                fontWeight="600" 
                gutterBottom 
                sx={{ 
                  mb: 0.5,
                  fontSize: { xs: '1.25rem', sm: '1.5rem' }
                }}
              >
                Platform Dashboard
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  opacity: 0.9, 
                  fontWeight: 400,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  display: { xs: 'none', sm: 'block' }
                }}
              >
                Welcome to the HRMS Platform Administration Center
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <Chip 
              icon={<RefreshIcon />}
              label={`Updated: ${new Date().toLocaleTimeString()}`} 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                '& .MuiChip-icon': { color: 'white' },
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }}
            />
          </Stack>
        </Box>
      </Paper>

      {dashboardData.error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 4, 
            borderRadius: 2,
            '& .MuiAlert-message': { fontSize: '1rem' }
          }} 
          onClose={() => setDashboardData(prev => ({ ...prev, error: null }))}
        >
          {dashboardData.error}
        </Alert>
      )}

      {/* Key Metrics */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: { xs: 2, sm: 3 }, 
        mb: 5 
      }}>
        <Box sx={{ 
          flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', lg: '1 1 calc(25% - 18px)' },
          minWidth: { xs: '100%', sm: '280px', lg: '240px' }
        }}>
          <Card 
            elevation={2}
            sx={{ 
              borderRadius: 2,
              backgroundColor: 'background.paper',
              height: '100%'
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3 }, height: '100%', display: 'flex', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Avatar sx={{ 
                  bgcolor: 'primary.main',
                  width: { xs: 40, sm: 48 }, 
                  height: { xs: 40, sm: 48 },
                  flexShrink: 0
                }}>
                  <BusinessIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography 
                    color="text.secondary" 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 500, 
                      display: 'block', 
                      mb: 0.5,
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}
                  >
                    Total Companies
                  </Typography>
                  <Typography 
                    variant="h4" 
                    fontWeight="700" 
                    color="text.primary"
                    sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}
                  >
                    {dashboardData.companies.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ 
          flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', lg: '1 1 calc(25% - 18px)' },
          minWidth: { xs: '100%', sm: '280px', lg: '240px' }
        }}>
          <Card 
            elevation={2}
            sx={{ 
              borderRadius: 2,
              backgroundColor: 'background.paper',
              height: '100%'
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3 }, height: '100%', display: 'flex', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Avatar sx={{ 
                  bgcolor: 'success.main',
                  width: { xs: 40, sm: 48 }, 
                  height: { xs: 40, sm: 48 },
                  flexShrink: 0
                }}>
                  <CheckCircleIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography 
                    color="text.secondary" 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 500, 
                      display: 'block', 
                      mb: 0.5,
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}
                  >
                    Active Companies
                  </Typography>
                  <Typography 
                    variant="h4" 
                    fontWeight="700" 
                    color="text.primary"
                    sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}
                  >
                    {dashboardData.activeCompanies}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ 
          flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', lg: '1 1 calc(25% - 18px)' },
          minWidth: { xs: '100%', sm: '280px', lg: '240px' }
        }}>
          <Card 
            elevation={2}
            sx={{ 
              borderRadius: 2,
              backgroundColor: 'background.paper',
              height: '100%'
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3 }, height: '100%', display: 'flex', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Avatar sx={{ 
                  bgcolor: 'info.main',
                  width: { xs: 40, sm: 48 }, 
                  height: { xs: 40, sm: 48 },
                  flexShrink: 0
                }}>
                  <PeopleIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography 
                    color="text.secondary" 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 500, 
                      display: 'block', 
                      mb: 0.5,
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}
                  >
                    Total Users
                  </Typography>
                  <Typography 
                    variant="h4" 
                    fontWeight="700" 
                    color="text.primary"
                    sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}
                  >
                    {dashboardData.totalUsers}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ 
          flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', lg: '1 1 calc(25% - 18px)' },
          minWidth: { xs: '100%', sm: '280px', lg: '240px' }
        }}>
          <Card 
            elevation={2}
            sx={{ 
              borderRadius: 2,
              backgroundColor: 'background.paper',
              height: '100%'
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3 }, height: '100%', display: 'flex', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Avatar 
                  sx={{ 
                    bgcolor: dashboardData.systemHealth?.status === 'healthy' 
                      ? 'success.main'
                      : dashboardData.systemHealth?.status === 'degraded' 
                      ? 'warning.main'
                      : 'error.main',
                    width: { xs: 40, sm: 48 }, 
                    height: { xs: 40, sm: 48 },
                    flexShrink: 0
                  }}
                >
                  {getHealthIcon(dashboardData.systemHealth?.status)}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography 
                    color="text.secondary" 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 500, 
                      display: 'block', 
                      mb: 0.5,
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}
                  >
                    System Health
                  </Typography>
                  <Typography 
                    variant="h5" 
                    fontWeight="700"
                    color={getHealthColor(dashboardData.systemHealth?.status)}
                    sx={{ 
                      textTransform: 'capitalize',
                      fontSize: { xs: '1.25rem', sm: '1.5rem' }
                    }}
                  >
                    {dashboardData.systemHealth?.status || 'Degraded'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* System Overview */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: { xs: 2, sm: 3, md: 4 }, 
        mb: 5 
      }}>
        <Box sx={{ 
          flex: { xs: '1 1 100%', lg: '1 1 calc(50% - 16px)' },
          minWidth: { xs: '100%', lg: '400px' }
        }}>
          <Card 
            elevation={2}
            sx={{ 
              borderRadius: 2,
              backgroundColor: 'background.paper',
              height: '100%'
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ 
                  bgcolor: 'warning.main',
                  width: { xs: 36, sm: 40 }, 
                  height: { xs: 36, sm: 40 }
                }}>
                  <MemoryIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                </Avatar>
                <Typography 
                  variant="h6" 
                  fontWeight="600" 
                  color="text.primary"
                  sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                >
                  System Resources
                </Typography>
              </Box>
              
              {dashboardData.systemHealth && (
                <Box>
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body1" fontWeight="500">Memory Usage</Typography>
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        {dashboardData.systemHealth.checks?.memory?.usagePercent || 0}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={dashboardData.systemHealth.checks?.memory?.usagePercent || 0}
                      color={(dashboardData.systemHealth.checks?.memory?.usagePercent || 0) > 80
                        ? 'error'
                        : (dashboardData.systemHealth.checks?.memory?.usagePercent || 0) > 60
                        ? 'warning'
                        : 'success'}
                      sx={{ 
                        height: 10, 
                        borderRadius: 2
                      }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {dashboardData.systemHealth.checks?.memory?.heapUsed || 0} MB / {dashboardData.systemHealth.checks?.memory?.heapTotal || 0} MB
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                    <Chip
                      label={`Database: ${dashboardData.systemHealth.checks?.database?.status || 'Unknown'}`}
                      color={dashboardData.systemHealth.checks?.database?.status === 'healthy' ? 'success' : 'error'}
                      sx={{ fontWeight: 500 }}
                    />
                    <Chip
                      label={`Uptime: ${Math.floor((dashboardData.systemHealth.uptime || 0) / 3600)}h ${Math.floor(((dashboardData.systemHealth.uptime || 0) % 3600) / 60)}m`}
                      variant="outlined"
                      sx={{ fontWeight: 500 }}
                    />
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ 
          flex: { xs: '1 1 100%', lg: '1 1 calc(50% - 16px)' },
          minWidth: { xs: '100%', lg: '400px' }
        }}>
          <Card 
            elevation={2}
            sx={{ 
              borderRadius: 2,
              backgroundColor: 'background.paper',
              height: '100%'
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ 
                  bgcolor: 'secondary.main',
                  width: { xs: 36, sm: 40 }, 
                  height: { xs: 36, sm: 40 }
                }}>
                  <StorageIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                </Avatar>
                <Typography 
                  variant="h6" 
                  fontWeight="600" 
                  color="text.primary"
                  sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                >
                  Department Overview
                </Typography>
              </Box>
              
              <Box>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  p: 3,
                  bgcolor: 'background.default',
                  borderRadius: 2,
                  mb: 2,
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Typography variant="body1" fontWeight="500" color="text.secondary">
                    Total Departments
                  </Typography>
                  <Typography variant="h4" fontWeight="700" color="primary.main">
                    {dashboardData.totalDepartments}
                  </Typography>
                </Box>
                
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  p: 3,
                  bgcolor: 'background.default',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Typography variant="body1" fontWeight="500" color="text.secondary">
                    Average per Company
                  </Typography>
                  <Typography variant="h5" fontWeight="700" color="info.main">
                    {dashboardData.companies.length > 0 
                      ? Math.round(dashboardData.totalDepartments / dashboardData.companies.length) 
                      : 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Detailed Information */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: { xs: 2, sm: 3, md: 4 }
      }}>
        <Box sx={{ 
          flex: { xs: '1 1 100%', lg: '1 1 calc(50% - 16px)' },
          minWidth: { xs: '100%', lg: '400px' }
        }}>
          <Card 
            elevation={2}
            sx={{ 
              borderRadius: 2,
              backgroundColor: 'background.paper',
              height: '100%'
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ 
                  bgcolor: 'success.main',
                  width: { xs: 36, sm: 40 }, 
                  height: { xs: 36, sm: 40 }
                }}>
                  <TrendingUpIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                </Avatar>
                <Typography 
                  variant="h6" 
                  fontWeight="600" 
                  color="text.primary"
                  sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                >
                  Top Companies by Users
                </Typography>
              </Box>
              
              <List sx={{ p: 0 }}>
                {getTopCompanies().map((company, index) => (
                  <React.Fragment key={company._id || company.slug || `company-${index}`}>
                    <ListItem 
                      sx={{ 
                        px: 0, 
                        py: 2
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            bgcolor: index === 0 
                              ? 'warning.main'
                              : index === 1 
                              ? 'secondary.main'
                              : 'primary.main',
                            fontSize: '0.875rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {index + 1}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body1" fontWeight="600">
                            {company.name || company.slug}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            {company.usage?.employees || company.statistics?.users || 0} employees • {company.subscription?.plan || company.metadata?.plan || 'No plan'}
                          </Typography>
                        }
                      />
                      <Chip
                        label={(company.status === 'active' || company.metadata?.isActive !== false) ? 'Active' : 'Inactive'}
                        color={(company.status === 'active' || company.metadata?.isActive !== false) ? 'success' : 'error'}
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    </ListItem>
                    {index < getTopCompanies().length - 1 && (
                      <Divider sx={{ my: 1, bgcolor: 'divider' }} />
                    )}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ 
          flex: { xs: '1 1 100%', lg: '1 1 calc(50% - 16px)' },
          minWidth: { xs: '100%', lg: '400px' }
        }}>
          <Card 
            elevation={2}
            sx={{ 
              borderRadius: 2,
              backgroundColor: 'background.paper',
              height: '100%'
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ 
                  bgcolor: 'info.main',
                  width: { xs: 36, sm: 40 }, 
                  height: { xs: 36, sm: 40 }
                }}>
                  <StorageIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                </Avatar>
                <Typography 
                  variant="h6" 
                  fontWeight="600" 
                  color="text.primary"
                  sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                >
                  Module Usage Statistics
                </Typography>
              </Box>
              
              <List sx={{ p: 0 }}>
                {getModuleUsage().map(([module, count], index) => (
                  <React.Fragment key={module}>
                    <ListItem 
                      sx={{ 
                        px: 0, 
                        py: 2
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body1" fontWeight="600" sx={{ textTransform: 'capitalize' }}>
                            {module.replace('-', ' ')}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            Used by {count} {count === 1 ? 'company' : 'companies'}
                          </Typography>
                        }
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 120 }}>
                        <LinearProgress
                          variant="determinate"
                          value={dashboardData.companies.length > 0 ? (count / dashboardData.companies.length) * 100 : 0}
                          color="info"
                          sx={{ 
                            width: 80, 
                            height: 8, 
                            borderRadius: 2
                          }}
                        />
                        <Typography variant="body2" fontWeight="600" color="secondary.main">
                          {dashboardData.companies.length > 0 ? Math.round((count / dashboardData.companies.length) * 100) : 0}%
                        </Typography>
                      </Box>
                    </ListItem>
                    {index < getModuleUsage().length - 1 && (
                      <Divider sx={{ my: 1, bgcolor: 'divider' }} />
                    )}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default PlatformDashboard;

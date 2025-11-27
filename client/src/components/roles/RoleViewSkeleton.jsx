/**
 * RoleViewSkeleton Component
 * 
 * Skeleton loader for role details view
 * Provides better perceived performance during initial load
 */

import React from 'react';
import {
    Box,
    Paper,
    Skeleton,
    Stack,
    Breadcrumbs,
    Divider,
    Grid
} from '@mui/material';

const RoleViewSkeleton = () => {
    return (
        <Box 
            role="status" 
            aria-live="polite" 
            aria-label="Loading role details"
            sx={{
                minHeight: '100vh',
                bgcolor: 'background.default',
                p: { xs: 2, sm: 3, md: 4 }
            }}>
            {/* Breadcrumb Skeleton */}
            <Breadcrumbs sx={{ mb: 3 }}>
                <Skeleton variant="text" width={60} />
                <Skeleton variant="text" width={60} />
                <Skeleton variant="text" width={100} />
            </Breadcrumbs>

            {/* Header Skeleton */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2, sm: 2.5, md: 3 },
                    mb: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                }}
            >
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 2
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
                        <Skeleton
                            variant="circular"
                            sx={{ 
                                width: { xs: 48, sm: 56 },
                                height: { xs: 48, sm: 56 },
                                bgcolor: 'rgba(255,255,255,0.2)' 
                            }}
                        />
                        <Box>
                            <Skeleton
                                variant="text"
                                sx={{ 
                                    width: { xs: 150, sm: 200 },
                                    height: { xs: 32, sm: 40 },
                                    bgcolor: 'rgba(255,255,255,0.2)' 
                                }}
                            />
                            <Skeleton
                                variant="text"
                                sx={{ 
                                    width: { xs: 120, sm: 150 },
                                    height: 20,
                                    bgcolor: 'rgba(255,255,255,0.2)' 
                                }}
                            />
                        </Box>
                    </Box>
                    <Box sx={{ 
                        display: 'flex', 
                        gap: 2,
                        width: { xs: '100%', sm: 'auto' },
                        flexDirection: { xs: 'column', sm: 'row' }
                    }}>
                        <Skeleton
                            variant="rectangular"
                            sx={{ 
                                width: { xs: '100%', sm: 100 },
                                height: 42,
                                borderRadius: 2.5, 
                                bgcolor: 'rgba(255,255,255,0.2)' 
                            }}
                        />
                        <Skeleton
                            variant="rectangular"
                            sx={{ 
                                width: { xs: '100%', sm: 100 },
                                height: 42,
                                borderRadius: 2.5, 
                                bgcolor: 'rgba(255,255,255,0.2)' 
                            }}
                        />
                    </Box>
                </Box>
            </Paper>

            <Grid container spacing={{ xs: 2, sm: 3 }}>
                {/* Role Metadata Card */}
                <Grid item xs={12} md={4}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 2, sm: 2.5, md: 3 },
                            borderRadius: 2.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            height: '100%'
                        }}
                    >
                        <Skeleton 
                            variant="text" 
                            sx={{ 
                                width: { xs: 120, sm: 150 },
                                height: { xs: 24, sm: 28 },
                                mb: 3 
                            }} 
                        />
                        
                        <Stack spacing={{ xs: 2.5, sm: 3 }}>
                            {[0, 1, 2, 3].map((index) => (
                                <Box key={index}>
                                    <Skeleton 
                                        variant="text" 
                                        sx={{ 
                                            width: { xs: 80, sm: 100 },
                                            height: 20,
                                            mb: 1 
                                        }} 
                                    />
                                    <Skeleton 
                                        variant="text" 
                                        sx={{ 
                                            width: '90%',
                                            height: 24 
                                        }} 
                                    />
                                </Box>
                            ))}
                        </Stack>
                    </Paper>
                </Grid>

                {/* Permissions Card */}
                <Grid item xs={12} md={8}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 2, sm: 2.5, md: 3 },
                            borderRadius: 2.5,
                            border: '1px solid',
                            borderColor: 'divider'
                        }}
                    >
                        <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            mb: 3,
                            flexDirection: { xs: 'column', sm: 'row' },
                            gap: 2
                        }}>
                            <Skeleton 
                                variant="text" 
                                sx={{ 
                                    width: { xs: 140, sm: 180 },
                                    height: { xs: 24, sm: 28 }
                                }} 
                            />
                            <Skeleton 
                                variant="rectangular" 
                                sx={{ 
                                    width: { xs: '100%', sm: 80 },
                                    height: 32,
                                    borderRadius: 3 
                                }} 
                            />
                        </Box>

                        <Divider sx={{ mb: 3 }} />

                        {/* Permission Categories */}
                        <Stack spacing={2}>
                            {[0, 1, 2, 3, 4].map((index) => (
                                <Paper
                                    key={index}
                                    elevation={0}
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Category Header */}
                                    <Box sx={{
                                        p: { xs: 1.5, sm: 2 },
                                        bgcolor: 'action.hover',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: { xs: 1.5, sm: 2 }
                                    }}>
                                        <Skeleton 
                                            variant="circular" 
                                            sx={{ 
                                                width: { xs: 20, sm: 24 },
                                                height: { xs: 20, sm: 24 }
                                            }} 
                                        />
                                        <Skeleton 
                                            variant="text" 
                                            sx={{ 
                                                width: { xs: 140, sm: 200 },
                                                height: 24,
                                                flex: 1 
                                            }} 
                                        />
                                        <Skeleton 
                                            variant="text" 
                                            sx={{ 
                                                width: { xs: 50, sm: 60 },
                                                height: 20,
                                                display: { xs: 'none', sm: 'block' }
                                            }} 
                                        />
                                    </Box>

                                    {/* Permissions List */}
                                    <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                                        <Grid container spacing={1}>
                                            {[0, 1, 2, 3].map((permIndex) => (
                                                <Grid item xs={12} sm={6} key={permIndex}>
                                                    <Box sx={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: { xs: 1, sm: 1.5 }
                                                    }}>
                                                        <Skeleton 
                                                            variant="circular" 
                                                            sx={{ 
                                                                width: { xs: 18, sm: 20 },
                                                                height: { xs: 18, sm: 20 }
                                                            }} 
                                                        />
                                                        <Skeleton 
                                                            variant="text" 
                                                            sx={{ 
                                                                width: '70%',
                                                                height: 20 
                                                            }} 
                                                        />
                                                    </Box>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Box>
                                </Paper>
                            ))}
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default RoleViewSkeleton;

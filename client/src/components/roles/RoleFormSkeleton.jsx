/**
 * RoleFormSkeleton Component
 * 
 * Skeleton loader for role create/edit form
 * Provides better perceived performance during initial load
 */

import React from 'react';
import {
    Box,
    Paper,
    Skeleton,
    Stack,
    Breadcrumbs,
    Divider
} from '@mui/material';

const RoleFormSkeleton = () => {
    return (
        <Box 
            role="status" 
            aria-live="polite" 
            aria-label="Loading role form"
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
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2
                }}>
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
                                width: { xs: 200, sm: 300 },
                                height: 20,
                                bgcolor: 'rgba(255,255,255,0.2)' 
                            }}
                        />
                    </Box>
                </Box>
            </Paper>

            {/* Form Skeleton */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2, sm: 3, md: 4 },
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'divider'
                }}
            >
                {/* Basic Information Section */}
                <Box sx={{ mb: 4 }}>
                    <Skeleton 
                        variant="text" 
                        sx={{ 
                            width: { xs: 140, sm: 180 },
                            height: { xs: 28, sm: 32 },
                            mb: 3 
                        }} 
                    />
                    
                    <Stack spacing={3}>
                        {/* Name field */}
                        <Box>
                            <Skeleton 
                                variant="text" 
                                sx={{ 
                                    width: { xs: 100, sm: 120 },
                                    height: 20,
                                    mb: 1 
                                }} 
                            />
                            <Skeleton 
                                variant="rectangular" 
                                sx={{ 
                                    height: { xs: 48, sm: 56 },
                                    borderRadius: 1 
                                }} 
                            />
                        </Box>

                        {/* Display Name field */}
                        <Box>
                            <Skeleton 
                                variant="text" 
                                sx={{ 
                                    width: { xs: 120, sm: 140 },
                                    height: 20,
                                    mb: 1 
                                }} 
                            />
                            <Skeleton 
                                variant="rectangular" 
                                sx={{ 
                                    height: { xs: 48, sm: 56 },
                                    borderRadius: 1 
                                }} 
                            />
                        </Box>

                        {/* Description field */}
                        <Box>
                            <Skeleton 
                                variant="text" 
                                sx={{ 
                                    width: { xs: 100, sm: 120 },
                                    height: 20,
                                    mb: 1 
                                }} 
                            />
                            <Skeleton 
                                variant="rectangular" 
                                sx={{ 
                                    height: { xs: 80, sm: 100 },
                                    borderRadius: 1 
                                }} 
                            />
                        </Box>
                    </Stack>
                </Box>

                <Divider sx={{ my: { xs: 3, sm: 4 } }} />

                {/* Permissions Section */}
                <Box sx={{ mb: 4 }}>
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
                                width: { xs: 160, sm: 200 },
                                height: { xs: 28, sm: 32 }
                            }} 
                        />
                        <Skeleton 
                            variant="rectangular" 
                            sx={{ 
                                width: { xs: '100%', sm: 120 },
                                height: 32,
                                borderRadius: 3 
                            }} 
                        />
                    </Box>

                    {/* Permission Categories */}
                    <Stack spacing={2}>
                        {[0, 1, 2, 3].map((index) => (
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
                                            width: { xs: 60, sm: 80 },
                                            height: 20,
                                            display: { xs: 'none', sm: 'block' }
                                        }} 
                                    />
                                </Box>

                                {/* Permissions List */}
                                <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                                    <Stack spacing={1.5}>
                                        {[0, 1, 2].map((permIndex) => (
                                            <Box 
                                                key={permIndex} 
                                                sx={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: { xs: 1.5, sm: 2 }
                                                }}
                                            >
                                                <Skeleton 
                                                    variant="rectangular" 
                                                    sx={{ 
                                                        width: { xs: 18, sm: 20 },
                                                        height: { xs: 18, sm: 20 },
                                                        borderRadius: 0.5 
                                                    }} 
                                                />
                                                <Skeleton 
                                                    variant="text" 
                                                    sx={{ 
                                                        width: { xs: '70%', sm: '60%' },
                                                        height: 20 
                                                    }} 
                                                />
                                            </Box>
                                        ))}
                                    </Stack>
                                </Box>
                            </Paper>
                        ))}
                    </Stack>
                </Box>

                {/* Action Buttons */}
                <Box sx={{ 
                    display: 'flex', 
                    gap: 2, 
                    justifyContent: 'flex-end', 
                    mt: 4,
                    flexDirection: { xs: 'column', sm: 'row' }
                }}>
                    <Skeleton 
                        variant="rectangular" 
                        sx={{ 
                            width: { xs: '100%', sm: 100 },
                            height: 42,
                            borderRadius: 1 
                        }} 
                    />
                    <Skeleton 
                        variant="rectangular" 
                        sx={{ 
                            width: { xs: '100%', sm: 100 },
                            height: 42,
                            borderRadius: 1 
                        }} 
                    />
                </Box>
            </Paper>
        </Box>
    );
};

export default RoleFormSkeleton;

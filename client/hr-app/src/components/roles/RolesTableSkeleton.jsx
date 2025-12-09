/**
 * RolesTableSkeleton Component
 * 
 * Skeleton loader for the roles table
 * Provides better perceived performance during initial load
 */

import React from 'react';
import {
    Box,
    Paper,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Stack
} from '@mui/material';

const RolesTableSkeleton = ({ rows = 5 }) => {
    return (
        <Box role="status" aria-live="polite" aria-label="Loading roles">
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
                                    width: { xs: 100, sm: 120 },
                                    height: { xs: 32, sm: 40 },
                                    bgcolor: 'rgba(255,255,255,0.2)' 
                                }}
                            />
                            <Skeleton
                                variant="text"
                                sx={{ 
                                    width: { xs: 150, sm: 200 },
                                    height: 20,
                                    bgcolor: 'rgba(255,255,255,0.2)' 
                                }}
                            />
                        </Box>
                    </Box>
                    <Skeleton
                        variant="rectangular"
                        sx={{ 
                            width: { xs: '100%', sm: 140 },
                            height: 42,
                            borderRadius: 2.5, 
                            bgcolor: 'rgba(255,255,255,0.2)' 
                        }}
                    />
                </Box>
            </Paper>

            {/* Stats Cards Skeleton */}
            <Box sx={{ 
                display: 'grid',
                gridTemplateColumns: { 
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)'
                },
                gap: { xs: 2, sm: 2.5 },
                mb: 4
            }}>
                {[0, 1, 2].map((index) => (
                    <Paper
                        key={index}
                        elevation={0}
                        sx={{
                            p: { xs: 2, sm: 2.5 },
                            borderRadius: 2.5,
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} alignItems="center">
                            <Skeleton 
                                variant="circular" 
                                sx={{ 
                                    width: { xs: 40, sm: 48 },
                                    height: { xs: 40, sm: 48 }
                                }} 
                            />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Skeleton variant="text" width="60%" height={20} />
                                <Skeleton variant="text" width="40%" sx={{ height: { xs: 32, sm: 40 } }} />
                            </Box>
                        </Stack>
                    </Paper>
                ))}
            </Box>

            {/* Search and Filter Skeleton */}
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, mb: 3, borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ 
                    display: 'flex', 
                    gap: 2, 
                    flexDirection: { xs: 'column', sm: 'row' }
                }}>
                    <Skeleton
                        variant="rectangular"
                        sx={{ 
                            flex: { xs: '1', sm: '1 1 300px' },
                            minWidth: { xs: '100%', sm: 200 },
                            height: 40, 
                            borderRadius: 2 
                        }}
                    />
                    <Skeleton
                        variant="rectangular"
                        sx={{ 
                            flex: { xs: '1', sm: '0 1 200px' },
                            minWidth: { xs: '100%', sm: 150 },
                            height: 40, 
                            borderRadius: 2 
                        }}
                    />
                </Box>
            </Paper>

            {/* Results Info Skeleton */}
            <Box sx={{ mb: 2 }}>
                <Skeleton variant="text" width={150} height={20} />
            </Box>

            {/* Table Skeleton */}
            <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    overflow: 'auto',
                    overflowX: { xs: 'auto', md: 'hidden' }
                }}
            >
                <Table sx={{ minWidth: { xs: 800, md: 650 } }}>
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell sx={{ minWidth: { xs: 120, md: 'auto' } }}>
                                <Skeleton variant="text" width="80%" />
                            </TableCell>
                            <TableCell sx={{ minWidth: { xs: 140, md: 'auto' } }}>
                                <Skeleton variant="text" width="80%" />
                            </TableCell>
                            <TableCell sx={{ minWidth: { xs: 200, md: 'auto' }, display: { xs: 'none', lg: 'table-cell' } }}>
                                <Skeleton variant="text" width="80%" />
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: { xs: 100, md: 'auto' } }}>
                                <Skeleton variant="text" width="80%" sx={{ mx: 'auto' }} />
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: { xs: 100, md: 'auto' } }}>
                                <Skeleton variant="text" width="80%" sx={{ mx: 'auto' }} />
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: { xs: 120, md: 'auto' } }}>
                                <Skeleton variant="text" width="80%" sx={{ mx: 'auto' }} />
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {Array.from({ length: rows }).map((_, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    <Skeleton variant="text" width="90%" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton variant="text" width="85%" />
                                </TableCell>
                                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                                    <Skeleton variant="text" width="95%" />
                                </TableCell>
                                <TableCell align="center">
                                    <Skeleton
                                        variant="rectangular"
                                        width={40}
                                        height={24}
                                        sx={{ mx: 'auto', borderRadius: 3 }}
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <Skeleton
                                        variant="rectangular"
                                        width={70}
                                        height={24}
                                        sx={{ mx: 'auto', borderRadius: 3 }}
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <Box sx={{ display: 'flex', gap: { xs: 0.5, md: 1 }, justifyContent: 'center' }}>
                                        <Skeleton 
                                            variant="circular" 
                                            sx={{ 
                                                width: { xs: 28, md: 32 },
                                                height: { xs: 28, md: 32 }
                                            }} 
                                        />
                                        <Skeleton 
                                            variant="circular" 
                                            sx={{ 
                                                width: { xs: 28, md: 32 },
                                                height: { xs: 28, md: 32 }
                                            }} 
                                        />
                                        <Skeleton 
                                            variant="circular" 
                                            sx={{ 
                                                width: { xs: 28, md: 32 },
                                                height: { xs: 28, md: 32 }
                                            }} 
                                        />
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default RolesTableSkeleton;

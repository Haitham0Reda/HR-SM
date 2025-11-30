/**
 * LoadingSkeleton Component
 * 
 * Skeleton loaders for better perceived performance
 * Shows placeholder content while data is loading
 * 
 * Usage:
 * <LoadingSkeleton variant="card" count={3} />
 * <LoadingSkeleton variant="table" rows={5} />
 */

import React from 'react';
import { Box, Card, CardContent, Skeleton, Grid } from '@mui/material';

const LoadingSkeleton = ({
    variant = 'card',
    count = 1,
    rows = 5,
    animation = 'wave' // 'wave' | 'pulse' | false
}) => {
    // Card Skeleton
    const CardSkeleton = () => (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Skeleton variant="circular" width={40} height={40} animation={animation} />
                    <Box sx={{ ml: 2, flex: 1 }}>
                        <Skeleton variant="text" width="60%" animation={animation} />
                        <Skeleton variant="text" width="40%" animation={animation} />
                    </Box>
                </Box>
                <Skeleton variant="rectangular" height={100} animation={animation} sx={{ mb: 2, borderRadius: 1 }} />
                <Skeleton variant="text" animation={animation} />
                <Skeleton variant="text" width="80%" animation={animation} />
            </CardContent>
        </Card>
    );

    // Table Skeleton
    const TableSkeleton = () => (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} variant="text" width="25%" animation={animation} />
                ))}
            </Box>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 2, mb: 1, p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} variant="text" width="25%" animation={animation} />
                    ))}
                </Box>
            ))}
        </Box>
    );

    // List Skeleton
    const ListSkeleton = () => (
        <Box>
            {Array.from({ length: rows }).map((_, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 2 }}>
                    <Skeleton variant="circular" width={50} height={50} animation={animation} />
                    <Box sx={{ ml: 2, flex: 1 }}>
                        <Skeleton variant="text" width="70%" animation={animation} />
                        <Skeleton variant="text" width="50%" animation={animation} />
                    </Box>
                    <Skeleton variant="rectangular" width={80} height={30} animation={animation} sx={{ borderRadius: 1 }} />
                </Box>
            ))}
        </Box>
    );

    // Profile Skeleton
    const ProfileSkeleton = () => (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                    <Skeleton variant="circular" width={120} height={120} animation={animation} sx={{ mb: 2 }} />
                    <Skeleton variant="text" width="60%" height={32} animation={animation} />
                    <Skeleton variant="text" width="40%" animation={animation} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {Array.from({ length: 5 }).map((_, index) => (
                        <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Skeleton variant="text" width="30%" animation={animation} />
                            <Skeleton variant="text" width="50%" animation={animation} />
                        </Box>
                    ))}
                </Box>
            </CardContent>
        </Card>
    );

    // Dashboard Skeleton
    const DashboardSkeleton = () => (
        <Box>
            {/* Header */}
            <Skeleton variant="rectangular" height={120} animation={animation} sx={{ mb: 3, borderRadius: 2 }} />

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                {Array.from({ length: 4 }).map((_, index) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Skeleton variant="circular" width={40} height={40} animation={animation} />
                                    <Skeleton variant="text" width={60} height={40} animation={animation} sx={{ ml: 2 }} />
                                </Box>
                                <Skeleton variant="text" width="60%" animation={animation} />
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Content Cards */}
            <Grid container spacing={3}>
                {Array.from({ length: 6 }).map((_, index) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                        <CardSkeleton />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );

    const renderSkeleton = () => {
        switch (variant) {
            case 'table':
                return <TableSkeleton />;
            case 'list':
                return <ListSkeleton />;
            case 'profile':
                return <ProfileSkeleton />;
            case 'dashboard':
                return <DashboardSkeleton />;
            case 'card':
            default:
                return (
                    <Grid container spacing={3}>
                        {Array.from({ length: count }).map((_, index) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                                <CardSkeleton />
                            </Grid>
                        ))}
                    </Grid>
                );
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            {renderSkeleton()}
        </Box>
    );
};

export default LoadingSkeleton;

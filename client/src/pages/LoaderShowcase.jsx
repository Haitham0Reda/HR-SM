/**
 * Loader Showcase Page
 * 
 * Demonstrates all available loading components and variants
 * Use this as a reference for implementing loaders in your app
 */

import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Grid,
    Paper,
    Divider,
    ToggleButtonGroup,
    ToggleButton,
} from '@mui/material';
import {
    Loading,
    LoadingOverlay,
    LoadingSkeleton,
    PageTransition
} from '../components/common';

const LoaderShowcase = () => {
    const [overlayOpen, setOverlayOpen] = useState(false);
    const [overlayVariant, setOverlayVariant] = useState('gradient');
    const [loaderVariant, setLoaderVariant] = useState('gradient');
    const [loaderSize, setLoaderSize] = useState('medium');
    const [skeletonVariant, setSkeletonVariant] = useState('card');

    const handleShowOverlay = (variant) => {
        setOverlayVariant(variant);
        setOverlayOpen(true);
        setTimeout(() => setOverlayOpen(false), 3000);
    };

    return (
        <PageTransition>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                {/* Header */}
                <Paper
                    sx={{
                        p: 3,
                        mb: 4,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white'
                    }}
                >
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Loading Components Showcase
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                        Modern, animated loading components for better user experience
                    </Typography>
                </Paper>

                {/* Loading Component Variants */}
                <Card sx={{ mb: 4 }}>
                    <CardContent>
                        <Typography variant="h5" fontWeight="600" gutterBottom>
                            1. Loading Component Variants
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Use these for inline loading states within pages
                        </Typography>

                        {/* Variant Selector */}
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Variant:</Typography>
                            <ToggleButtonGroup
                                value={loaderVariant}
                                exclusive
                                onChange={(e, value) => value && setLoaderVariant(value)}
                                size="small"
                            >
                                <ToggleButton value="gradient">Gradient</ToggleButton>
                                <ToggleButton value="spinner">Spinner</ToggleButton>
                                <ToggleButton value="dots">Dots</ToggleButton>
                                <ToggleButton value="pulse">Pulse</ToggleButton>
                                <ToggleButton value="bars">Bars</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>

                        {/* Size Selector */}
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Size:</Typography>
                            <ToggleButtonGroup
                                value={loaderSize}
                                exclusive
                                onChange={(e, value) => value && setLoaderSize(value)}
                                size="small"
                            >
                                <ToggleButton value="small">Small</ToggleButton>
                                <ToggleButton value="medium">Medium</ToggleButton>
                                <ToggleButton value="large">Large</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>

                        {/* Preview */}
                        <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.default' }}>
                            <Loading
                                variant={loaderVariant}
                                size={loaderSize}
                                message="Loading your data..."
                            />
                        </Paper>

                        {/* Code Example */}
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.900', borderRadius: 1, color: 'grey.100' }}>
                            <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace' }}>
                                {`import { Loading } from '../components/common';

<Loading 
    variant="${loaderVariant}" 
    size="${loaderSize}"
    message="Loading your data..."
/>`}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>

                {/* Loading Overlay */}
                <Card sx={{ mb: 4 }}>
                    <CardContent>
                        <Typography variant="h5" fontWeight="600" gutterBottom>
                            2. Loading Overlay
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Full-screen overlay with backdrop blur for blocking operations
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={() => handleShowOverlay('gradient')}
                                    sx={{ py: 2 }}
                                >
                                    Show Gradient Overlay
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    fullWidth
                                    onClick={() => handleShowOverlay('orbit')}
                                    sx={{ py: 2 }}
                                >
                                    Show Orbit Overlay
                                </Button>
                            </Grid>
                        </Grid>

                        {/* Code Example */}
                        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.900', borderRadius: 1, color: 'grey.100' }}>
                            <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace' }}>
                                {`import { LoadingOverlay } from '../components/common';

const [loading, setLoading] = useState(false);

<LoadingOverlay 
    open={loading} 
    message="Saving changes..."
    variant="gradient"
    blur={true}
/>`}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>

                {/* Loading Skeletons */}
                <Card sx={{ mb: 4 }}>
                    <CardContent>
                        <Typography variant="h5" fontWeight="600" gutterBottom>
                            3. Loading Skeletons
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Skeleton screens for better perceived performance
                        </Typography>

                        {/* Variant Selector */}
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Variant:</Typography>
                            <ToggleButtonGroup
                                value={skeletonVariant}
                                exclusive
                                onChange={(e, value) => value && setSkeletonVariant(value)}
                                size="small"
                            >
                                <ToggleButton value="card">Card</ToggleButton>
                                <ToggleButton value="table">Table</ToggleButton>
                                <ToggleButton value="list">List</ToggleButton>
                                <ToggleButton value="profile">Profile</ToggleButton>
                                <ToggleButton value="dashboard">Dashboard</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>

                        {/* Preview */}
                        <Paper variant="outlined" sx={{ bgcolor: 'background.default' }}>
                            <LoadingSkeleton
                                variant={skeletonVariant}
                                count={3}
                                rows={5}
                            />
                        </Paper>

                        {/* Code Example */}
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.900', borderRadius: 1, color: 'grey.100' }}>
                            <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace' }}>
                                {`import { LoadingSkeleton } from '../components/common';

<LoadingSkeleton 
    variant="${skeletonVariant}"
    count={3}
    rows={5}
/>`}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>

                {/* Usage Guide */}
                <Card>
                    <CardContent>
                        <Typography variant="h5" fontWeight="600" gutterBottom>
                            When to Use Each Loader
                        </Typography>
                        <Divider sx={{ my: 2 }} />

                        <Grid container spacing={3}>
                            <Grid item xs={12} md={4}>
                                <Box>
                                    <Typography variant="h6" color="primary" gutterBottom>
                                        Loading Component
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        • Inline loading states<br />
                                        • Page sections loading<br />
                                        • Small data fetches<br />
                                        • Non-blocking operations
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Box>
                                    <Typography variant="h6" color="secondary" gutterBottom>
                                        Loading Overlay
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        • Form submissions<br />
                                        • File uploads<br />
                                        • Critical operations<br />
                                        • Blocking user interaction
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Box>
                                    <Typography variant="h6" color="success.main" gutterBottom>
                                        Loading Skeleton
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        • Initial page load<br />
                                        • List/table loading<br />
                                        • Better perceived speed<br />
                                        • Content placeholders
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                {/* Loading Overlay Component */}
                <LoadingOverlay
                    open={overlayOpen}
                    message="This will close in 3 seconds..."
                    variant={overlayVariant}
                />
            </Box>
        </PageTransition>
    );
};

export default LoaderShowcase;

/**
 * Example Animated Page
 * 
 * This is a complete example showing how to add animations to any page
 * Copy this pattern to your other pages
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
    Avatar,
    Chip,
} from '@mui/material';
import {
    Person as PersonIcon,
    TrendingUp as TrendingUpIcon,
    Assessment as AssessmentIcon,
    Notifications as NotificationsIcon,
} from '@mui/icons-material';

// Import animation components
import { PageTransition, AnimatedCard, AnimatedButton } from '../components/common';

const ExampleAnimatedPage = () => {
    const [count, setCount] = useState(0);

    // Sample data
    const stats = [
        { title: 'Total Users', value: '1,234', icon: PersonIcon, color: 'primary', delay: 100 },
        { title: 'Active Today', value: '856', icon: TrendingUpIcon, color: 'success', delay: 200 },
        { title: 'Reports', value: '42', icon: AssessmentIcon, color: 'warning', delay: 300 },
        { title: 'Notifications', value: '12', icon: NotificationsIcon, color: 'error', delay: 400 },
    ];

    const cards = [
        { title: 'Card 1', description: 'This card animates on load', delay: 200 },
        { title: 'Card 2', description: 'Each card has a staggered delay', delay: 300 },
        { title: 'Card 3', description: 'Hover over cards to see effects', delay: 400 },
        { title: 'Card 4', description: 'Smooth and professional animations', delay: 500 },
    ];

    return (
        <PageTransition direction="up" timeout={600}>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                {/* Header with fade-in animation */}
                <Paper
                    className="animate-fade-in"
                    sx={{
                        p: 3,
                        mb: 3,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        borderRadius: 2
                    }}
                >
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Example Animated Page
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                        This page demonstrates all animation components. Copy this pattern to your pages!
                    </Typography>
                </Paper>

                {/* Stats Cards with staggered animations */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <Grid item xs={12} sm={6} md={3} key={index}>
                                <AnimatedCard delay={stat.delay}>
                                    <Card sx={{ height: '100%' }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                                <Avatar
                                                    sx={{
                                                        bgcolor: `${stat.color}.main`,
                                                        mr: 2
                                                    }}
                                                >
                                                    <Icon />
                                                </Avatar>
                                                <Typography variant="h4" fontWeight="bold">
                                                    {stat.value}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {stat.title}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </AnimatedCard>
                            </Grid>
                        );
                    })}
                </Grid>

                {/* Interactive Section */}
                <AnimatedCard delay={500}>
                    <Paper sx={{ p: 3, mb: 4 }}>
                        <Typography variant="h5" fontWeight="600" gutterBottom>
                            Interactive Animations
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Click the button to see animated interactions
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                            <AnimatedButton>
                                <Button
                                    variant="contained"
                                    onClick={() => setCount(count + 1)}
                                >
                                    Click Me ({count})
                                </Button>
                            </AnimatedButton>

                            <AnimatedButton>
                                <Button variant="outlined" color="secondary">
                                    Hover Over Me
                                </Button>
                            </AnimatedButton>

                            <AnimatedButton>
                                <Button variant="contained" color="success">
                                    Press Me
                                </Button>
                            </AnimatedButton>

                            {count > 0 && (
                                <Chip
                                    label={`Clicked ${count} times!`}
                                    color="primary"
                                    className="animate-scale-in"
                                />
                            )}
                        </Box>
                    </Paper>
                </AnimatedCard>

                {/* Content Cards Grid */}
                <Typography variant="h5" fontWeight="600" sx={{ mb: 3 }}>
                    Content Cards
                </Typography>
                <Grid container spacing={3}>
                    {cards.map((card, index) => (
                        <Grid item xs={12} sm={6} md={3} key={index}>
                            <AnimatedCard delay={card.delay}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        background: `linear-gradient(135deg, ${index % 4 === 0 ? '#667eea, #764ba2' :
                                                index % 4 === 1 ? '#f093fb, #f5576c' :
                                                    index % 4 === 2 ? '#4facfe, #00f2fe' :
                                                        '#43e97b, #38f9d7'
                                            })`,
                                        color: 'white'
                                    }}
                                >
                                    <CardContent>
                                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                                            {card.title}
                                        </Typography>
                                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                            {card.description}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </AnimatedCard>
                        </Grid>
                    ))}
                </Grid>

                {/* CSS Animation Examples */}
                <Box sx={{ mt: 4 }}>
                    <Typography variant="h5" fontWeight="600" sx={{ mb: 3 }}>
                        CSS Animation Classes
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={4}>
                            <Paper className="animate-slide-up hover-lift" sx={{ p: 2 }}>
                                <Typography variant="body2">
                                    .animate-slide-up + .hover-lift
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <Paper className="animate-fade-in animate-delay-200 hover-scale" sx={{ p: 2 }}>
                                <Typography variant="body2">
                                    .animate-fade-in + .hover-scale
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <Paper className="animate-scale-in animate-delay-300 hover-glow" sx={{ p: 2 }}>
                                <Typography variant="body2">
                                    .animate-scale-in + .hover-glow
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                </Box>

                {/* Usage Instructions */}
                <AnimatedCard delay={600}>
                    <Paper sx={{ p: 3, mt: 4, bgcolor: 'info.light' }}>
                        <Typography variant="h6" fontWeight="600" gutterBottom>
                            How to Apply to Your Pages
                        </Typography>
                        <Typography variant="body2" component="div">
                            <ol>
                                <li>Wrap your page content with <code>&lt;PageTransition&gt;</code></li>
                                <li>Wrap cards with <code>&lt;AnimatedCard delay=&#123;200&#125;&gt;</code></li>
                                <li>Wrap buttons with <code>&lt;AnimatedButton&gt;</code></li>
                                <li>Add CSS classes like <code>className="animate-fade-in"</code></li>
                                <li>Check ANIMATION_USAGE_GUIDE.md for complete documentation</li>
                            </ol>
                        </Typography>
                    </Paper>
                </AnimatedCard>
            </Box>
        </PageTransition>
    );
};

export default ExampleAnimatedPage;

import React from 'react';
import { Box, Paper, Typography, Grid, Card, CardContent } from '@mui/material';
import CelebrationIcon from '@mui/icons-material/Celebration';

function SeasonalSettingsPage() {
    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <CelebrationIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h4" component="h1">
                    Seasonal Settings
                </Typography>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Configure Seasonal Settings
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Manage seasonal configurations, holidays, and special events for your organization.
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

export default SeasonalSettingsPage;

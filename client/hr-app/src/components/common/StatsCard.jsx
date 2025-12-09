import React from 'react';
import { Card, CardContent, Typography, Box, Avatar } from '@mui/material';
import PropTypes from 'prop-types';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const StatsCard = ({
    title,
    value,
    icon: Icon,
    color = 'primary',
    trend,
    trendValue,
    subtitle,
}) => {
    const getTrendIcon = () => {
        if (!trend) return null;
        return trend === 'up' ? (
            <TrendingUpIcon sx={{ fontSize: 16 }} />
        ) : (
            <TrendingDownIcon sx={{ fontSize: 16 }} />
        );
    };

    const getTrendColor = () => {
        if (!trend) return 'text.secondary';
        return trend === 'up' ? 'success.main' : 'error.main';
    };

    return (
        <Card
            sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 2,
                transition: 'all 0.3s',
                '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-4px)',
                },
                height: '100%',
            }}
        >
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, mb: 1 }}
                        >
                            {title}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                            {value}
                        </Typography>
                        {subtitle && (
                            <Typography variant="body2" color="text.secondary">
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                    {Icon && (
                        <Avatar
                            sx={{
                                bgcolor: `${color}.light`,
                                color: `${color}.contrastText`,
                                width: 56,
                                height: 56,
                            }}
                        >
                            <Icon sx={{ fontSize: 28 }} />
                        </Avatar>
                    )}
                </Box>
                {(trend || trendValue) && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            color: getTrendColor(),
                        }}
                    >
                        {getTrendIcon()}
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {trendValue}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            vs last period
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

StatsCard.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    icon: PropTypes.elementType,
    color: PropTypes.oneOf(['primary', 'secondary', 'success', 'error', 'warning', 'info']),
    trend: PropTypes.oneOf(['up', 'down']),
    trendValue: PropTypes.string,
    subtitle: PropTypes.string,
};

export default StatsCard;

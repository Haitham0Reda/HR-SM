import React from 'react';
import { Card, CardContent, CardHeader, CardActions, Divider } from '@mui/material';
import PropTypes from 'prop-types';

const StyledCard = ({
    title,
    subtitle,
    action,
    children,
    footer,
    elevation = 2,
    noPadding = false,
    ...props
}) => {
    return (
        <Card
            elevation={elevation}
            sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.3s',
                '&:hover': {
                    boxShadow: 4,
                },
                ...props.sx,
            }}
            {...props}
        >
            {(title || action) && (
                <>
                    <CardHeader
                        title={title}
                        subheader={subtitle}
                        action={action}
                        sx={{
                            '& .MuiCardHeader-title': {
                                fontWeight: 600,
                                fontSize: '1.125rem',
                            },
                            '& .MuiCardHeader-subheader': {
                                fontSize: '0.875rem',
                                mt: 0.5,
                            },
                        }}
                    />
                    <Divider />
                </>
            )}
            <CardContent
                sx={{
                    p: noPadding ? 0 : 3,
                    '&:last-child': {
                        pb: noPadding ? 0 : 3,
                    },
                }}
            >
                {children}
            </CardContent>
            {footer && (
                <>
                    <Divider />
                    <CardActions sx={{ p: 2, justifyContent: 'flex-end' }}>{footer}</CardActions>
                </>
            )}
        </Card>
    );
};

StyledCard.propTypes = {
    title: PropTypes.node,
    subtitle: PropTypes.node,
    action: PropTypes.node,
    children: PropTypes.node.isRequired,
    footer: PropTypes.node,
    elevation: PropTypes.number,
    noPadding: PropTypes.bool,
};

export default StyledCard;

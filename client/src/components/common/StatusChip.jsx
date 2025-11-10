import React from 'react';
import { Chip } from '@mui/material';
import PropTypes from 'prop-types';

const StatusChip = ({ status, label, size = 'small' }) => {
    const getStatusColor = (status) => {
        const statusLower = status?.toLowerCase();
        switch (statusLower) {
            case 'active':
            case 'approved':
            case 'completed':
            case 'present':
            case 'success':
                return {
                    bgcolor: 'success.light',
                    color: 'success.contrastText',
                    borderColor: 'success.main',
                };
            case 'pending':
            case 'in-progress':
            case 'processing':
                return {
                    bgcolor: 'warning.light',
                    color: 'warning.contrastText',
                    borderColor: 'warning.main',
                };
            case 'inactive':
            case 'rejected':
            case 'cancelled':
            case 'absent':
            case 'failed':
            case 'error':
                return {
                    bgcolor: 'error.light',
                    color: 'error.contrastText',
                    borderColor: 'error.main',
                };
            case 'draft':
            case 'disabled':
                return {
                    bgcolor: 'grey.300',
                    color: 'grey.800',
                    borderColor: 'grey.500',
                };
            default:
                return {
                    bgcolor: 'info.light',
                    color: 'info.contrastText',
                    borderColor: 'info.main',
                };
        }
    };

    const colors = getStatusColor(status);

    return (
        <Chip
            label={label || status}
            size={size}
            sx={{
                ...colors,
                fontWeight: 600,
                fontSize: size === 'small' ? '0.75rem' : '0.875rem',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                border: '2px solid',
                px: 0.5,
            }}
        />
    );
};

StatusChip.propTypes = {
    status: PropTypes.string.isRequired,
    label: PropTypes.string,
    size: PropTypes.oneOf(['small', 'medium']),
};

export default StatusChip;

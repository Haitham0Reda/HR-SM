import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const Loading = ({ message = 'Loading...' }) => {
    return (
        <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            minHeight="400px"
            gap={2}
        >
            <CircularProgress size={48} />
            <Typography color="text.secondary">{message}</Typography>
        </Box>
    );
};

export default Loading;

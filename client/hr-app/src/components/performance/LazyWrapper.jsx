import React, { Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';

/**
 * Lazy loading wrapper with optimized loading state
 */
const LazyWrapper = ({ children, fallback }) => {
  const defaultFallback = (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minHeight="200px"
      sx={{ 
        // Prevent layout shift during loading
        width: '100%',
        height: '100%'
      }}
    >
      <CircularProgress size={24} />
    </Box>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

export default LazyWrapper;
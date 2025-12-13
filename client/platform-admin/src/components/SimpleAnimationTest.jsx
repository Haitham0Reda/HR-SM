import React from 'react';
import { Box } from '@mui/material';

const SimpleAnimationTest = () => {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        background: '#1a1a1a',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* CSS Animation Test */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 100,
          height: 100,
          background: 'red',
          transform: 'translate(-50%, -50%)',
          '@keyframes testPulse': {
            '0%, 100%': { transform: 'translate(-50%, -50%) scale(1)' },
            '50%': { transform: 'translate(-50%, -50%) scale(1.5)' }
          },
          animation: 'testPulse 2s ease-in-out infinite'
        }}
      />
      
      {/* Another test with different approach */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          left: '20%',
          width: 80,
          height: 80,
          background: 'blue',
          '@keyframes testFloat': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-30px)' }
          },
          animation: 'testFloat 3s ease-in-out infinite'
        }}
      />
      
      {/* CSS Transform Test */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          right: '20%',
          width: 60,
          height: 60,
          background: 'green',
          '@keyframes testRotate': {
            'from': { transform: 'rotate(0deg)' },
            'to': { transform: 'rotate(360deg)' }
          },
          animation: 'testRotate 4s linear infinite'
        }}
      />
      
      {/* Text indicator */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          fontSize: '24px',
          textAlign: 'center'
        }}
      >
        Simple Animation Test
        <br />
        <Box component="span" sx={{ fontSize: '16px', opacity: 0.7 }}>
          Red should pulse, Blue should float, Green should rotate
        </Box>
      </Box>
    </Box>
  );
};

export default SimpleAnimationTest;
import React from 'react';
import { Box, Typography } from '@mui/material';

const AnimationVerification = () => {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 25%, #c084fc 50%, #a78bfa 75%, #8b5cf6 100%)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      {/* Simple pulsing circle */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          left: '20%',
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.3)',
          '@keyframes simplePulse': {
            '0%, 100%': { transform: 'scale(1)', opacity: 0.3 },
            '50%': { transform: 'scale(1.5)', opacity: 0.7 }
          },
          animation: 'simplePulse 2s ease-in-out infinite'
        }}
      />
      
      {/* Floating element */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          right: '20%',
          width: 60,
          height: 60,
          background: 'rgba(255, 255, 255, 0.4)',
          borderRadius: '20%',
          '@keyframes simpleFloat': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-30px)' }
          },
          animation: 'simpleFloat 3s ease-in-out infinite'
        }}
      />
      
      {/* Rotating square */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '20%',
          left: '20%',
          width: 50,
          height: 50,
          background: 'rgba(255, 255, 255, 0.5)',
          '@keyframes simpleRotate': {
            'from': { transform: 'rotate(0deg)' },
            'to': { transform: 'rotate(360deg)' }
          },
          animation: 'simpleRotate 4s linear infinite'
        }}
      />
      
      {/* Center text */}
      <Typography
        variant="h3"
        sx={{
          color: 'white',
          textAlign: 'center',
          fontWeight: 'bold',
          textShadow: '0 2px 10px rgba(0,0,0,0.3)',
          '@keyframes textGlow': {
            '0%, 100%': { textShadow: '0 2px 10px rgba(0,0,0,0.3)' },
            '50%': { textShadow: '0 2px 20px rgba(255,255,255,0.5), 0 0 30px rgba(255,255,255,0.3)' }
          },
          animation: 'textGlow 4s ease-in-out infinite'
        }}
      >
        Animation Test
        <br />
        <Typography variant="h6" component="span" sx={{ opacity: 0.8 }}>
          If you see moving elements, animations work!
        </Typography>
      </Typography>
    </Box>
  );
};

export default AnimationVerification;
import React from 'react';
import { Box } from '@mui/material';
import { keyframes } from '@mui/system';

const simpleFloat = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
`;

const simplePulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 1; }
`;

const simpleRotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const AnimationTest = () => {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        overflow: 'hidden'
      }}
    >
      {/* Simple floating circle */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          left: '20%',
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: '#ff6b6b',
          animation: `${simpleFloat} 3s ease-in-out infinite`
        }}
      />
      
      {/* Pulsing square */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          right: '20%',
          width: 80,
          height: 80,
          background: '#4ecdc4',
          animation: `${simplePulse} 2s ease-in-out infinite`
        }}
      />
      
      {/* Rotating triangle */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '20%',
          left: '50%',
          width: 0,
          height: 0,
          borderLeft: '40px solid transparent',
          borderRight: '40px solid transparent',
          borderBottom: '70px solid #45b7d1',
          animation: `${simpleRotate} 4s linear infinite`,
          transformOrigin: 'center 70%'
        }}
      />
      
      {/* Multiple small particles */}
      {Array.from({ length: 10 }).map((_, index) => (
        <Box
          key={index}
          sx={{
            position: 'absolute',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#f7b731',
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animation: `${simplePulse} ${Math.random() * 2 + 1}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`
          }}
        />
      ))}
      
      {/* Test text */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '2rem',
          fontWeight: 'bold',
          textAlign: 'center'
        }}
      >
        Animation Test
        <br />
        <Box component="span" sx={{ fontSize: '1rem', opacity: 0.7 }}>
          If you see moving elements, animations are working!
        </Box>
      </Box>
    </Box>
  );
};

export default AnimationTest;
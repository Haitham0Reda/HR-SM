import React from 'react';
import { Box, useTheme, GlobalStyles } from '@mui/material';

const AnimatedBackground = ({ children }) => {
  const theme = useTheme();

  return (
    <>
      <GlobalStyles
        styles={{
          '@keyframes floatLarge': {
            '0%, 100%': { transform: 'translateY(0px) translateX(0px) scale(1)' },
            '33%': { transform: 'translateY(-30px) translateX(20px) scale(1.1)' },
            '66%': { transform: 'translateY(10px) translateX(-15px) scale(0.9)' }
          },
          '@keyframes floatMedium': {
            '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
            '50%': { transform: 'translateY(-40px) rotate(180deg)' }
          },
          '@keyframes pulse': {
            '0%, 100%': { transform: 'scale(1)', opacity: 0.6 },
            '50%': { transform: 'scale(1.3)', opacity: 0.9 }
          },
          '@keyframes simplePulse': {
            '0%, 100%': { transform: 'translate(-50%, -50%) scale(1)' },
            '50%': { transform: 'translate(-50%, -50%) scale(1.5)' }
          },
          '@keyframes rotate': {
            'from': { transform: 'rotate(0deg)' },
            'to': { transform: 'rotate(360deg)' }
          },
          '@keyframes wobble': {
            '0%, 100%': { transform: 'rotate(0deg) scale(1)' },
            '25%': { transform: 'rotate(5deg) scale(1.1)' },
            '75%': { transform: 'rotate(-5deg) scale(0.9)' }
          },
          '@keyframes drift': {
            '0%': { transform: 'translateY(0px) translateX(0px)' },
            '25%': { transform: 'translateY(-25px) translateX(15px)' },
            '50%': { transform: 'translateY(-12px) translateX(-8px)' },
            '75%': { transform: 'translateY(8px) translateX(12px)' },
            '100%': { transform: 'translateY(0px) translateX(0px)' }
          },
          '@keyframes morph': {
            '0%, 100%': { 
              borderRadius: '50%',
              transform: 'scale(1) rotate(0deg)'
            },
            '25%': { 
              borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
              transform: 'scale(1.2) rotate(90deg)'
            },
            '50%': { 
              borderRadius: '70% 30% 30% 70% / 70% 70% 30% 30%',
              transform: 'scale(0.8) rotate(180deg)'
            },
            '75%': { 
              borderRadius: '40% 60% 60% 40% / 60% 40% 60% 40%',
              transform: 'scale(1.1) rotate(270deg)'
            }
          },
          '@keyframes morphSmall': {
            '0%, 100%': { 
              borderRadius: '50%',
              transform: 'scale(1)'
            },
            '50%': { 
              borderRadius: '20% 80% 20% 80% / 80% 20% 80% 20%',
              transform: 'scale(1.3)'
            }
          },
          '@keyframes wave': {
            '0%': { transform: 'translateX(-100%) skewX(0deg)' },
            '50%': { transform: 'translateX(50%) skewX(15deg)' },
            '100%': { transform: 'translateX(100%) skewX(0deg)' }
          },
          '@keyframes waveReverse': {
            '0%': { transform: 'translateX(100%) skewX(0deg)' },
            '50%': { transform: 'translateX(-50%) skewX(-15deg)' },
            '100%': { transform: 'translateX(-100%) skewX(0deg)' }
          },
          '@keyframes sparkle': {
            '0%, 100%': { transform: 'scale(0) rotate(0deg)', opacity: 0 },
            '50%': { transform: 'scale(1) rotate(180deg)', opacity: 1 }
          },
          '@keyframes gridMove': {
            '0%': { transform: 'translate(0, 0)' },
            '100%': { transform: 'translate(50px, 50px)' }
          }
        }}
      />
      <Box
        sx={{
          position: 'relative',
          minHeight: '100vh',
          overflow: 'hidden',
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #0f1419 0%, #1a202c 25%, #2d3748 50%, #1a202c 75%, #0f1419 100%)'
            : 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 25%, #c084fc 50%, #a78bfa 75%, #8b5cf6 100%)',
        }}
      >
        {/* Animated Background Elements */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            zIndex: 0
          }}
        >
          {/* Large Floating Orbs with Login Color Palette */}
          <Box
            sx={{
              position: 'absolute',
              top: '15%',
              left: '10%',
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3), rgba(139, 92, 246, 0.1), transparent)',
              animation: 'floatLarge 8s ease-in-out infinite',
              animationDelay: '0s'
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              top: '60%',
              right: '15%',
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(167, 139, 250, 0.4), rgba(167, 139, 250, 0.15), transparent)',
              animation: 'floatMedium 6s ease-in-out infinite',
              animationDelay: '2s'
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              bottom: '20%',
              left: '20%',
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(192, 132, 252, 0.35), rgba(192, 132, 252, 0.12), transparent)',
              animation: 'pulse 4s ease-in-out infinite',
              animationDelay: '1s'
            }}
          />

          {/* Geometric Shapes with Theme Colors */}
          <Box
            sx={{
              position: 'absolute',
              top: '25%',
              right: '25%',
              width: 80,
              height: 80,
              background: 'linear-gradient(45deg, rgba(139, 92, 246, 0.2), rgba(167, 139, 250, 0.2))',
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
              animation: 'rotate 12s linear infinite'
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              top: '40%',
              left: '5%',
              width: 60,
              height: 60,
              background: 'linear-gradient(135deg, rgba(192, 132, 252, 0.25), transparent)',
              borderRadius: '20%',
              animation: 'wobble 5s ease-in-out infinite',
              animationDelay: '1.5s'
            }}
          />

          {/* Floating Particles with Login Theme */}
          {Array.from({ length: 20 }).map((_, index) => (
            <Box
              key={`particle-${index}`}
              sx={{
                position: 'absolute',
                width: Math.random() * 8 + 4,
                height: Math.random() * 8 + 4,
                borderRadius: '50%',
                background: [
                  'rgba(139, 92, 246, 0.6)',
                  'rgba(167, 139, 250, 0.6)',
                  'rgba(192, 132, 252, 0.6)',
                  'rgba(196, 181, 253, 0.6)'
                ][index % 4],
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animation: `drift ${8 + Math.random() * 6}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 4}s`,
                boxShadow: '0 0 10px rgba(139, 92, 246, 0.3)'
              }}
            />
          ))}

          {/* Morphing Blobs */}
          <Box
            sx={{
              position: 'absolute',
              top: '10%',
              right: '10%',
              width: 100,
              height: 100,
              background: 'linear-gradient(45deg, rgba(139, 92, 246, 0.2), rgba(192, 132, 252, 0.2))',
              animation: 'morph 10s ease-in-out infinite',
              animationDelay: '3s'
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              bottom: '30%',
              right: '5%',
              width: 80,
              height: 80,
              background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.25), rgba(196, 181, 253, 0.25))',
              animation: 'morphSmall 7s ease-in-out infinite',
              animationDelay: '1.5s'
            }}
          />

          {/* Animated Lines/Waves */}
          <Box
            sx={{
              position: 'absolute',
              top: '30%',
              left: 0,
              right: 0,
              height: 2,
              background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.4), rgba(167, 139, 250, 0.4), transparent)',
              animation: 'wave 8s ease-in-out infinite'
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              bottom: '40%',
              left: 0,
              right: 0,
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(192, 132, 252, 0.3), rgba(196, 181, 253, 0.3), transparent)',
              animation: 'waveReverse 12s ease-in-out infinite',
              animationDelay: '2s'
            }}
          />

          {/* Sparkle Effects */}
          {Array.from({ length: 15 }).map((_, index) => (
            <Box
              key={`sparkle-${index}`}
              sx={{
                position: 'absolute',
                width: 6,
                height: 6,
                background: 'rgba(196, 181, 253, 0.8)',
                borderRadius: '50%',
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animation: `sparkle ${2 + Math.random() * 3}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 5}s`,
                boxShadow: '0 0 8px rgba(196, 181, 253, 0.6)'
              }}
            />
          ))}

          {/* Grid Pattern Overlay */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.03,
              backgroundImage: `
                linear-gradient(rgba(139, 92, 246, 0.5) 1px, transparent 1px),
                linear-gradient(90deg, rgba(139, 92, 246, 0.5) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
              animation: 'gridMove 20s linear infinite'
            }}
          />

          {/* Test Element - Very Visible */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 50,
              height: 50,
              background: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'simplePulse 2s ease-in-out infinite',
              zIndex: 5,
              border: '2px solid rgba(139, 92, 246, 0.8)'
            }}
          />
        </Box>

        {/* Content */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {children}
        </Box>
      </Box>
    </>
  );
};

export default AnimatedBackground;
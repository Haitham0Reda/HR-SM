import React from 'react';
import { Card, CardContent, Box, Typography, Button, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { designTokens } from '../../theme/designTokens';

/**
 * ActionCard Component
 * 
 * Quick action cards with icon, title, description, and call-to-action button.
 * 
 * @param {Object} props
 * @param {string} props.id - Unique identifier for the card
 * @param {string} props.title - Card title
 * @param {React.ReactNode} props.icon - Icon to display at the top
 * @param {string} props.description - Descriptive text explaining the action
 * @param {string} props.buttonText - Text for the action button
 * @param {string} [props.buttonColor='primary'] - Color of the action button
 * @param {string} props.route - Route to navigate to when button is clicked
 * @param {string} [props.badge] - Optional badge text to display
 * @param {Function} [props.onClick] - Optional custom click handler (overrides route navigation)
 * @param {Object} [props.sx] - Additional MUI sx prop for styling
 */
const ActionCard = ({
  id,
  title,
  icon,
  description,
  buttonText,
  buttonColor = 'primary',
  route,
  badge,
  onClick,
  sx = {}
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (route) {
      navigate(route);
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: designTokens.borderRadius.lg,
        border: `1px solid`,
        borderColor: 'divider',
        transition: `box-shadow ${designTokens.transitions.duration.standard}ms ${designTokens.transitions.easing.easeInOut}, transform ${designTokens.transitions.duration.standard}ms ${designTokens.transitions.easing.easeInOut}, border-color ${designTokens.transitions.duration.standard}ms ${designTokens.transitions.easing.easeInOut}`,
        '&:hover': {
          boxShadow: designTokens.shadows.lg,
          transform: 'translateY(-4px)',
          borderColor: `${buttonColor}.main`,
        },
        ...sx
      }}
    >
      <CardContent 
        sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          gap: 2,
          p: 3,
        }}
      >
        {/* Icon and Badge */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: designTokens.borderRadius.lg,
              bgcolor: `${buttonColor}.light`,
              color: `${buttonColor}.main`,
              '& > *': {
                fontSize: '2rem',
              },
            }}
          >
            {icon}
          </Box>
          {badge && (
            <Chip
              label={badge}
              size="small"
              color={buttonColor}
              sx={{
                fontWeight: designTokens.typography.fontWeight.semibold,
                fontSize: designTokens.typography.fontSize.xs,
              }}
            />
          )}
        </Box>

        {/* Title */}
        <Typography
          variant="h6"
          component="h3"
          sx={{
            fontWeight: designTokens.typography.fontWeight.semibold,
            fontSize: designTokens.typography.fontSize.lg,
            lineHeight: 1.3,
          }}
        >
          {title}
        </Typography>

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            flex: 1,
            fontSize: designTokens.typography.fontSize.sm,
            lineHeight: 1.6,
          }}
        >
          {description}
        </Typography>

        {/* Action Button */}
        <Button
          variant="contained"
          color={buttonColor}
          onClick={handleClick}
          fullWidth
          sx={{
            mt: 'auto',
            borderRadius: designTokens.borderRadius.md,
            textTransform: 'none',
            fontWeight: designTokens.typography.fontWeight.semibold,
            py: 1.5,
          }}
        >
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ActionCard;

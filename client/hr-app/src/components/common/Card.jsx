/**
 * Standardized Card Component
 * 
 * A wrapper around MUI Card with consistent styling and hover effects.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Card as MuiCard, CardContent, CardHeader, CardActions } from '@mui/material';
import { designTokens } from '../../theme/designTokens';

const Card = React.forwardRef(({
  children,
  title,
  subtitle,
  action,
  actions,
  hover = false,
  elevation = 0,
  sx = {},
  ...props
}, ref) => {
  return (
    <MuiCard
      ref={ref}
      elevation={elevation}
      sx={{
        borderRadius: designTokens.borderRadius.lg,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: designTokens.shadows.sm,
        transition: 'all 0.3s ease-in-out',
        
        ...(hover && {
          '&:hover': {
            boxShadow: designTokens.shadows.md,
            transform: 'translateY(-2px)',
            borderColor: 'primary.main',
          },
        }),
        
        ...sx,
      }}
      {...props}
    >
      {(title || subtitle || action) && (
        <CardHeader
          title={title}
          subheader={subtitle}
          action={action}
          sx={{
            '& .MuiCardHeader-title': {
              fontWeight: designTokens.typography.fontWeight.semibold,
              fontSize: designTokens.typography.fontSize.lg,
            },
            '& .MuiCardHeader-subheader': {
              fontSize: designTokens.typography.fontSize.sm,
            },
          }}
        />
      )}
      
      <CardContent
        sx={{
          padding: designTokens.spacing.lg,
          '&:last-child': {
            paddingBottom: designTokens.spacing.lg,
          },
        }}
      >
        {children}
      </CardContent>
      
      {actions && (
        <CardActions
          sx={{
            padding: designTokens.spacing.md,
            paddingTop: 0,
          }}
        >
          {actions}
        </CardActions>
      )}
    </MuiCard>
  );
});

Card.displayName = 'Card';

Card.propTypes = {
  /** Card content */
  children: PropTypes.node.isRequired,
  
  /** Card title */
  title: PropTypes.node,
  
  /** Card subtitle */
  subtitle: PropTypes.node,
  
  /** Action element in header (e.g., IconButton) */
  action: PropTypes.node,
  
  /** Action buttons at bottom of card */
  actions: PropTypes.node,
  
  /** Enable hover effect */
  hover: PropTypes.bool,
  
  /** Card elevation (0-24) */
  elevation: PropTypes.number,
  
  /** Custom styles */
  sx: PropTypes.object,
};

export default Card;

import React from 'react';
import { Typography as MuiTypography } from '@mui/material';
import PropTypes from 'prop-types';

/**
 * Typography Component
 * 
 * A wrapper around MUI Typography with consistent styling from design tokens.
 * Provides a standardized way to render text with proper hierarchy and styling.
 * 
 * @component
 * @example
 * <Typography variant="h1">Page Title</Typography>
 * <Typography variant="body1" color="text.secondary">Description text</Typography>
 */
const Typography = ({ 
  variant = 'body1',
  component,
  color,
  align,
  gutterBottom,
  noWrap,
  paragraph,
  children,
  sx,
  ...props 
}) => {
  return (
    <MuiTypography
      variant={variant}
      component={component}
      color={color}
      align={align}
      gutterBottom={gutterBottom}
      noWrap={noWrap}
      paragraph={paragraph}
      sx={sx}
      {...props}
    >
      {children}
    </MuiTypography>
  );
};

Typography.propTypes = {
  /**
   * Typography variant to use
   */
  variant: PropTypes.oneOf([
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'body1', 'body2',
    'button', 'caption', 'overline',
    'subtitle1', 'subtitle2',
  ]),
  /**
   * HTML element to render
   */
  component: PropTypes.elementType,
  /**
   * Text color
   */
  color: PropTypes.string,
  /**
   * Text alignment
   */
  align: PropTypes.oneOf(['left', 'center', 'right', 'justify']),
  /**
   * Add bottom margin
   */
  gutterBottom: PropTypes.bool,
  /**
   * Prevent text wrapping
   */
  noWrap: PropTypes.bool,
  /**
   * Render as paragraph with bottom margin
   */
  paragraph: PropTypes.bool,
  /**
   * Content to render
   */
  children: PropTypes.node,
  /**
   * Additional styles
   */
  sx: PropTypes.object,
};

export default Typography;

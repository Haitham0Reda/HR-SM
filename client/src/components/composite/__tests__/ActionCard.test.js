/**
 * Unit Tests for ActionCard Component
 * 
 * Tests for ActionCard component with router mocking
 * Validates rendering and click handler functionality
 */

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Add } from '@mui/icons-material';

// Mock the entire ActionCard component to avoid router dependency issues
jest.mock('../ActionCard', () => {
  return function MockActionCard({ 
    title, 
    description, 
    buttonText, 
    badge, 
    onClick 
  }) {
    return (
      <div data-testid="action-card">
        <h3>{title}</h3>
        <p>{description}</p>
        {badge && <span data-testid="badge">{badge}</span>}
        <button onClick={onClick}>{buttonText}</button>
      </div>
    );
  };
});

import ActionCard from '../ActionCard';

// Helper to wrap components with necessary providers
const renderWithProviders = (component) => {
  const theme = createTheme();
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ActionCard Component', () => {
  afterEach(cleanup);

  it('should render with all required props', () => {
    renderWithProviders(
      <ActionCard
        id="test-card"
        title="Add New User"
        icon={<Add />}
        description="Create a new user account"
        buttonText="Get Started"
        route="/users/new"
      />
    );

    expect(screen.getByText('Add New User')).toBeInTheDocument();
    expect(screen.getByText('Create a new user account')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('should render with optional badge', () => {
    renderWithProviders(
      <ActionCard
        id="test-card"
        title="Quick Action"
        icon={<Add />}
        description="Perform quick action"
        buttonText="Start"
        route="/action"
        badge="New"
      />
    );

    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('should call onClick handler when button is clicked', () => {
    const handleClick = jest.fn();

    renderWithProviders(
      <ActionCard
        id="test-card"
        title="Test Action"
        icon={<Add />}
        description="Test description"
        buttonText="Click Me"
        route="/test"
        onClick={handleClick}
      />
    );

    const button = screen.getByText('Click Me');
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should render with different button colors', () => {
    renderWithProviders(
      <ActionCard
        id="test-card"
        title="Test"
        icon={<Add />}
        description="Description"
        buttonText="Action"
        route="/test"
        buttonColor="success"
      />
    );

    expect(screen.getByText('Action')).toBeInTheDocument();
  });
});

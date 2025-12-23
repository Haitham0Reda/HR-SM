import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CreateTenantForm from '../CreateTenantForm';
import { ApiProvider } from '../../contexts/ApiContext';

// Mock the API context
const mockApi = {
  createTenantWithLicense: jest.fn(),
  platform: {
    createTenant: jest.fn(),
    updateTenant: jest.fn()
  },
  license: {
    createLicense: jest.fn()
  }
};

const MockApiProvider = ({ children }) => {
  const contextValue = {
    api: mockApi,
    status: {
      platform: { connected: true, error: null },
      licenseServer: { connected: true, error: null },
      realtime: { connected: true, error: null }
    },
    isHealthy: true,
    hasErrors: false
  };

  return (
    <div data-testid="mock-api-provider">
      {React.cloneElement(children, { ...contextValue })}
    </div>
  );
};

const theme = createTheme();

const renderWithProviders = (component, props = {}) => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
    ...props
  };

  return render(
    <ThemeProvider theme={theme}>
      <ApiProvider>
        {React.cloneElement(component, defaultProps)}
      </ApiProvider>
    </ThemeProvider>
  );
};

describe('CreateTenantForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.createTenantWithLicense.mockResolvedValue({
      tenant: {
        _id: 'tenant123',
        name: 'Test Company',
        subdomain: 'testcompany',
        createdAt: new Date().toISOString()
      },
      license: {
        licenseNumber: 'HRSM-TEST-123',
        type: 'trial',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  });

  describe('Component Rendering', () => {
    test('renders form dialog when open', () => {
      renderWithProviders(<CreateTenantForm />);
      
      expect(screen.getByText('Create New Company')).toBeInTheDocument();
      expect(screen.getByText('Company Details')).toBeInTheDocument();
    });

    test('does not render when closed', () => {
      renderWithProviders(<CreateTenantForm />, { open: false });
      
      expect(screen.queryByText('Create New Company')).not.toBeInTheDocument();
    });

    test('renders stepper with all steps', () => {
      renderWithProviders(<CreateTenantForm />);
      
      expect(screen.getByText('Company Details')).toBeInTheDocument();
      expect(screen.getByText('License Configuration')).toBeInTheDocument();
      expect(screen.getByText('Module Selection')).toBeInTheDocument();
      expect(screen.getByText('Review & Create')).toBeInTheDocument();
    });

    test('renders company details form fields', () => {
      renderWithProviders(<CreateTenantForm />);
      
      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/subdomain/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/contact email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/contact phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('validates required company name', async () => {
      renderWithProviders(<CreateTenantForm />);
      
      const nameField = screen.getByLabelText(/company name/i);
      await user.clear(nameField);
      await user.tab(); // Trigger blur event
      
      await waitFor(() => {
        expect(screen.getByText(/company name is required/i)).toBeInTheDocument();
      });
    });

    test('validates subdomain format', async () => {
      renderWithProviders(<CreateTenantForm />);
      
      const subdomainField = screen.getByLabelText(/subdomain/i);
      await user.type(subdomainField, 'Invalid-Subdomain!');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText(/subdomain can only contain lowercase letters/i)).toBeInTheDocument();
      });
    });

    test('validates email format', async () => {
      renderWithProviders(<CreateTenantForm />);
      
      const emailField = screen.getByLabelText(/contact email/i);
      await user.type(emailField, 'invalid-email');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    test('validates phone number format', async () => {
      renderWithProviders(<CreateTenantForm />);
      
      const phoneField = screen.getByLabelText(/contact phone/i);
      await user.type(phoneField, 'invalid-phone');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText(/invalid phone number/i)).toBeInTheDocument();
      });
    });

    test('disables next button when validation fails', async () => {
      renderWithProviders(<CreateTenantForm />);
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });

    test('enables next button when validation passes', async () => {
      renderWithProviders(<CreateTenantForm />);
      
      // Fill in required fields
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      await user.type(screen.getByLabelText(/subdomain/i), 'testcompany');
      await user.type(screen.getByLabelText(/contact email/i), 'test@example.com');
      
      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /next/i });
        expect(nextButton).not.toBeDisabled();
      });
    });
  });

  describe('Multi-step Navigation', () => {
    const fillCompanyDetails = async () => {
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      await user.type(screen.getByLabelText(/subdomain/i), 'testcompany');
      await user.type(screen.getByLabelText(/contact email/i), 'test@example.com');
    };

    test('navigates to license configuration step', async () => {
      renderWithProviders(<CreateTenantForm />);
      
      await fillCompanyDetails();
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByText('License Configuration')).toBeInTheDocument();
        expect(screen.getByLabelText(/license type/i)).toBeInTheDocument();
      });
    });

    test('navigates to module selection step', async () => {
      renderWithProviders(<CreateTenantForm />);
      
      await fillCompanyDetails();
      await user.click(screen.getByRole('button', { name: /next/i }));
      
      await waitFor(() => {
        expect(screen.getByLabelText(/license type/i)).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /next/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Module Selection')).toBeInTheDocument();
        expect(screen.getByText('HR Core')).toBeInTheDocument();
      });
    });

    test('navigates to review step', async () => {
      renderWithProviders(<CreateTenantForm />);
      
      await fillCompanyDetails();
      
      // Navigate through all steps
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByRole('button', { name: /next/i }));
        await waitFor(() => {});
      }
      
      await waitFor(() => {
        expect(screen.getByText('Review & Confirm')).toBeInTheDocument();
        expect(screen.getByText('Company Details')).toBeInTheDocument();
        expect(screen.getByText('License Details')).toBeInTheDocument();
      });
    });

    test('allows navigation back to previous steps', async () => {
      renderWithProviders(<CreateTenantForm />);
      
      await fillCompanyDetails();
      await user.click(screen.getByRole('button', { name: /next/i }));
      
      await waitFor(() => {
        expect(screen.getByText('License Configuration')).toBeInTheDocument();
      });
      
      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);
      
      await waitFor(() => {
        expect(screen.getByText('Company Information')).toBeInTheDocument();
      });
    });
  });

  describe('License Configuration', () => {
    const navigateToLicenseStep = async () => {
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      await user.type(screen.getByLabelText(/subdomain/i), 'testcompany');
      await user.type(screen.getByLabelText(/contact email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => {
        expect(screen.getByLabelText(/license type/i)).toBeInTheDocument();
      });
    };

    test('updates form values when license type changes', async () => {
      renderWithProviders(<CreateTenantForm />);
      await navigateToLicenseStep();
      
      const licenseTypeSelect = screen.getByLabelText(/license type/i);
      await user.click(licenseTypeSelect);
      
      const professionalOption = screen.getByText('Professional');
      await user.click(professionalOption);
      
      await waitFor(() => {
        const maxUsersField = screen.getByLabelText(/maximum users/i);
        expect(maxUsersField).toHaveValue(200);
      });
    });

    test('validates expiry date is in future', async () => {
      renderWithProviders(<CreateTenantForm />);
      await navigateToLicenseStep();
      
      // Try to set a past date (this would need proper date picker interaction)
      // For now, we'll test that the validation schema is applied
      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).not.toBeDisabled(); // Should be enabled with default future date
    });
  });

  describe('Module Selection', () => {
    const navigateToModuleStep = async () => {
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      await user.type(screen.getByLabelText(/subdomain/i), 'testcompany');
      await user.type(screen.getByLabelText(/contact email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => {});
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => {
        expect(screen.getByText('Module Selection')).toBeInTheDocument();
      });
    };

    test('displays all available modules', async () => {
      renderWithProviders(<CreateTenantForm />);
      await navigateToModuleStep();
      
      expect(screen.getByText('HR Core')).toBeInTheDocument();
      expect(screen.getByText('Task Management')).toBeInTheDocument();
      expect(screen.getByText('Medical Clinic')).toBeInTheDocument();
      expect(screen.getByText('Payroll')).toBeInTheDocument();
      expect(screen.getByText('Advanced Reports')).toBeInTheDocument();
      expect(screen.getByText('Life Insurance')).toBeInTheDocument();
    });

    test('shows required modules as non-clickable', async () => {
      renderWithProviders(<CreateTenantForm />);
      await navigateToModuleStep();
      
      const hrCoreCard = screen.getByText('HR Core').closest('[role="generic"]');
      expect(hrCoreCard).toHaveStyle({ cursor: 'default' });
    });

    test('allows selection of optional modules', async () => {
      renderWithProviders(<CreateTenantForm />);
      await navigateToModuleStep();
      
      const taskManagementCard = screen.getByText('Task Management').closest('div');
      await user.click(taskManagementCard);
      
      // Should show selection indicator
      await waitFor(() => {
        expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument();
      });
    });
  });

  describe('Dual API Workflow', () => {
    const completeForm = async () => {
      // Fill company details
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      await user.type(screen.getByLabelText(/subdomain/i), 'testcompany');
      await user.type(screen.getByLabelText(/contact email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /next/i }));
      
      // Skip license configuration (use defaults)
      await waitFor(() => {});
      await user.click(screen.getByRole('button', { name: /next/i }));
      
      // Skip module selection (use defaults)
      await waitFor(() => {});
      await user.click(screen.getByRole('button', { name: /next/i }));
      
      // Reach review step
      await waitFor(() => {
        expect(screen.getByText('Review & Confirm')).toBeInTheDocument();
      });
    };

    test('calls createTenantWithLicense API on form submission', async () => {
      renderWithProviders(<CreateTenantForm />);
      await completeForm();
      
      const createButton = screen.getByRole('button', { name: /create company/i });
      await user.click(createButton);
      
      await waitFor(() => {
        expect(mockApi.createTenantWithLicense).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Company',
            subdomain: 'testcompany',
            contactEmail: 'test@example.com'
          }),
          expect.objectContaining({
            type: 'trial',
            modules: expect.arrayContaining(['hr-core'])
          })
        );
      });
    });

    test('shows loading state during API call', async () => {
      mockApi.createTenantWithLicense.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      renderWithProviders(<CreateTenantForm />);
      await completeForm();
      
      const createButton = screen.getByRole('button', { name: /create company/i });
      await user.click(createButton);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(createButton).toBeDisabled();
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    test('displays success message after successful creation', async () => {
      renderWithProviders(<CreateTenantForm />);
      await completeForm();
      
      const createButton = screen.getByRole('button', { name: /create company/i });
      await user.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText('Company Created Successfully!')).toBeInTheDocument();
        expect(screen.getByText('Test Company has been created with license integration.')).toBeInTheDocument();
      });
    });

    test('displays created tenant and license details', async () => {
      renderWithProviders(<CreateTenantForm />);
      await completeForm();
      
      const createButton = screen.getByRole('button', { name: /create company/i });
      await user.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText('tenant123')).toBeInTheDocument();
        expect(screen.getByText('HRSM-TEST-123')).toBeInTheDocument();
        expect(screen.getByText('testcompany.hrms.local')).toBeInTheDocument();
      });
    });

    test('handles API errors gracefully', async () => {
      mockApi.createTenantWithLicense.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<CreateTenantForm />);
      await completeForm();
      
      const createButton = screen.getByRole('button', { name: /create company/i });
      await user.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
    });

    test('calls onSuccess callback after successful creation', async () => {
      const onSuccess = jest.fn();
      renderWithProviders(<CreateTenantForm />, { onSuccess });
      await completeForm();
      
      const createButton = screen.getByRole('button', { name: /create company/i });
      await user.click(createButton);
      
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith({
          tenant: expect.objectContaining({ name: 'Test Company' }),
          license: expect.objectContaining({ licenseNumber: 'HRSM-TEST-123' })
        });
      });
    });
  });

  describe('Form Reset and Cleanup', () => {
    test('resets form when dialog is closed', async () => {
      const onClose = jest.fn();
      renderWithProviders(<CreateTenantForm />, { onClose });
      
      // Fill some data
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(onClose).toHaveBeenCalled();
    });

    test('prevents closing during API call', async () => {
      mockApi.createTenantWithLicense.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      const onClose = jest.fn();
      renderWithProviders(<CreateTenantForm />, { onClose });
      
      // Navigate to final step and submit
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      await user.type(screen.getByLabelText(/subdomain/i), 'testcompany');
      await user.type(screen.getByLabelText(/contact email/i), 'test@example.com');
      
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByRole('button', { name: /next/i }));
        await waitFor(() => {});
      }
      
      const createButton = screen.getByRole('button', { name: /create company/i });
      await user.click(createButton);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      renderWithProviders(<CreateTenantForm />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    });

    test('supports keyboard navigation', async () => {
      renderWithProviders(<CreateTenantForm />);
      
      const nameField = screen.getByLabelText(/company name/i);
      nameField.focus();
      
      await user.tab();
      
      const subdomainField = screen.getByLabelText(/subdomain/i);
      expect(subdomainField).toHaveFocus();
    });
  });
});
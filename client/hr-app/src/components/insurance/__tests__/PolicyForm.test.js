/**
 * PolicyForm Component Tests
 * 
 * Tests for PolicyForm validation, submission, and user interactions.
 * Validates: Requirements 5.1, 5.2
 */

import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import PolicyForm from '../PolicyForm';
import insuranceService from '../../../services/insurance.service';

// Mock the insurance service
jest.mock('../../../services/insurance.service');

// Mock the hooks
jest.mock('../../../hooks/useCompanyRouting', () => ({
    useCompanyRouting: () => ({
        getCompanyRoute: (path) => `/company${path}`
    })
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
    useNavigate: () => jest.fn()
}));

// Helper to wrap component with required providers
const renderWithProviders = (component) => {
    const theme = createTheme();
    return render(
        <ThemeProvider theme={theme}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                {component}
            </LocalizationProvider>
        </ThemeProvider>
    );
};

// Mock employee data
const mockEmployees = [
    {
        _id: 'emp1',
        name: 'John Doe',
        employeeNumber: 'EMP001',
        department: { name: 'Engineering' }
    },
    {
        _id: 'emp2',
        name: 'Jane Smith',
        employeeNumber: 'EMP002',
        department: { name: 'HR' }
    }
];

describe('PolicyForm Component', () => {
    const mockOnSubmit = jest.fn();
    const mockOnCancel = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        insuranceService.searchEmployees.mockResolvedValue({
            data: mockEmployees
        });
    });

    afterEach(() => {
        cleanup();
    });

    describe('Form Rendering', () => {
        it('should render all required form fields', () => {
            renderWithProviders(
                <PolicyForm onSubmit={mockOnSubmit} />
            );

            // Check for employee selection
            expect(screen.getByLabelText(/employee/i)).toBeInTheDocument();
            
            // Check for policy details
            expect(screen.getByLabelText(/policy type/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/coverage amount/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/premium/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/deductible/i)).toBeInTheDocument();
            
            // Check for dates using text field labels
            expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
            
            // Check for notes
            expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
            
            // Check for buttons
            expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /create policy/i })).toBeInTheDocument();
        });

        it('should render with initial values when provided', () => {
            const initialValues = {
                policyType: 'CAT_A',
                coverageAmount: 100000,
                premium: 150,
                deductible: 500,
                notes: 'Test policy'
            };

            renderWithProviders(
                <PolicyForm 
                    onSubmit={mockOnSubmit}
                    initialValues={initialValues}
                />
            );

            expect(screen.getByDisplayValue('Test policy')).toBeInTheDocument();
        });

        it('should show edit mode UI when isEditMode is true', () => {
            renderWithProviders(
                <PolicyForm 
                    onSubmit={mockOnSubmit}
                    isEditMode={true}
                />
            );

            expect(screen.getByRole('button', { name: /update policy/i })).toBeInTheDocument();
        });
    });

    describe('Form Validation', () => {
        it('should show validation errors for required fields', async () => {
            renderWithProviders(
                <PolicyForm onSubmit={mockOnSubmit} />
            );

            // Try to submit without filling required fields
            const submitButton = screen.getByRole('button', { name: /create policy/i });
            await userEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/employee is required/i)).toBeInTheDocument();
                expect(screen.getByText(/policy type is required/i)).toBeInTheDocument();
            });

            // Verify onSubmit was not called
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });

        it('should validate coverage amount is positive', async () => {
            renderWithProviders(
                <PolicyForm onSubmit={mockOnSubmit} />
            );

            const coverageInput = screen.getByLabelText(/coverage amount/i);
            await userEvent.clear(coverageInput);
            await userEvent.type(coverageInput, '-1000');

            const submitButton = screen.getByRole('button', { name: /create policy/i });
            await userEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/coverage amount must be greater than 0/i)).toBeInTheDocument();
            });
        });

        it('should validate premium is positive', async () => {
            renderWithProviders(
                <PolicyForm onSubmit={mockOnSubmit} />
            );

            const premiumInput = screen.getByLabelText(/premium/i);
            await userEvent.clear(premiumInput);
            await userEvent.type(premiumInput, '-100');

            const submitButton = screen.getByRole('button', { name: /create policy/i });
            await userEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/premium must be greater than 0/i)).toBeInTheDocument();
            });
        });

        it('should validate end date is after start date', async () => {
            renderWithProviders(
                <PolicyForm onSubmit={mockOnSubmit} />
            );

            // Set start date to future and end date to past using date picker inputs
            const startDateInput = screen.getByLabelText(/start date/i);
            const endDateInput = screen.getByLabelText(/end date/i);

            await userEvent.clear(startDateInput);
            await userEvent.type(startDateInput, '12/31/2024');
            
            await userEvent.clear(endDateInput);
            await userEvent.type(endDateInput, '01/01/2024');

            const submitButton = screen.getByRole('button', { name: /create policy/i });
            await userEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument();
            });
        });

        it('should validate deductible is not negative', async () => {
            renderWithProviders(
                <PolicyForm onSubmit={mockOnSubmit} />
            );

            const deductibleInput = screen.getByLabelText(/deductible/i);
            await userEvent.clear(deductibleInput);
            await userEvent.type(deductibleInput, '-500');

            const submitButton = screen.getByRole('button', { name: /create policy/i });
            await userEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/deductible cannot be negative/i)).toBeInTheDocument();
            });
        });
    });

    describe('Employee Search', () => {
        it('should search employees when typing in employee field', async () => {
            renderWithProviders(
                <PolicyForm onSubmit={mockOnSubmit} />
            );

            const employeeInput = screen.getByLabelText(/employee/i);
            await userEvent.type(employeeInput, 'John');

            await waitFor(() => {
                expect(insuranceService.searchEmployees).toHaveBeenCalledWith('John');
            });
        });

        it('should display employee search results', async () => {
            renderWithProviders(
                <PolicyForm onSubmit={mockOnSubmit} />
            );

            const employeeInput = screen.getByLabelText(/employee/i);
            await userEvent.type(employeeInput, 'John');

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });
        });

        it('should select employee from search results', async () => {
            renderWithProviders(
                <PolicyForm onSubmit={mockOnSubmit} />
            );

            const employeeInput = screen.getByLabelText(/employee/i);
            await userEvent.type(employeeInput, 'John');

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });

            const employeeOption = screen.getByText('John Doe');
            await userEvent.click(employeeOption);

            expect(employeeInput).toHaveValue('John Doe (EMP001)');
        });

        it('should disable employee selection in edit mode', () => {
            const initialValues = {
                employee: mockEmployees[0]
            };

            renderWithProviders(
                <PolicyForm 
                    onSubmit={mockOnSubmit}
                    isEditMode={true}
                    initialValues={initialValues}
                />
            );

            const employeeInput = screen.getByLabelText(/employee/i);
            expect(employeeInput).toBeDisabled();
        });
    });

    describe('Policy Type Selection', () => {
        it('should update coverage amounts when policy type changes', async () => {
            renderWithProviders(
                <PolicyForm onSubmit={mockOnSubmit} />
            );

            const policyTypeSelect = screen.getByLabelText(/policy type/i);
            await userEvent.click(policyTypeSelect);

            const catAOption = screen.getByText(/Category A/);
            await userEvent.click(catAOption);

            // Coverage amount should update to CAT_A default
            const coverageSelect = screen.getByLabelText(/coverage amount/i);
            expect(coverageSelect).toHaveValue(50000);
        });

        it('should update premium when policy type changes', async () => {
            renderWithProviders(
                <PolicyForm onSubmit={mockOnSubmit} />
            );

            const policyTypeSelect = screen.getByLabelText(/policy type/i);
            await userEvent.click(policyTypeSelect);

            const catBOption = screen.getByText(/Category B/);
            await userEvent.click(catBOption);

            // Premium should update to CAT_B default
            const premiumInput = screen.getByDisplayValue('200');
            expect(premiumInput).toBeInTheDocument();
        });
    });

    describe('Form Submission', () => {
        it('should submit form with valid data', async () => {
            renderWithProviders(
                <PolicyForm onSubmit={mockOnSubmit} />
            );

            // Fill in required fields
            const employeeInput = screen.getByLabelText(/employee/i);
            await userEvent.type(employeeInput, 'John');
            
            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });
            
            const employeeOption = screen.getByText('John Doe');
            await userEvent.click(employeeOption);

            const policyTypeSelect = screen.getByLabelText(/policy type/i);
            await userEvent.click(policyTypeSelect);
            const catCOption = screen.getByText(/Category C/);
            await userEvent.click(catCOption);

            const coverageSelect = screen.getByLabelText(/coverage amount/i);
            await userEvent.click(coverageSelect);
            const coverageOption = screen.getByText('$200,000');
            await userEvent.click(coverageOption);

            const premiumInput = screen.getByLabelText(/premium/i);
            await userEvent.clear(premiumInput);
            await userEvent.type(premiumInput, '300');

            const submitButton = screen.getByRole('button', { name: /create policy/i });
            await userEvent.click(submitButton);

            await waitFor(() => {
                expect(mockOnSubmit).toHaveBeenCalledWith(
                    expect.objectContaining({
                        employeeId: 'emp1',
                        policyType: 'CAT_C',
                        coverageAmount: 200000,
                        premium: 300
                    })
                );
            });
        });

        it('should handle submission errors gracefully', async () => {
            mockOnSubmit.mockRejectedValue(new Error('Submission failed'));
            
            renderWithProviders(
                <PolicyForm onSubmit={mockOnSubmit} />
            );

            // Fill in minimal required fields
            const employeeInput = screen.getByLabelText(/employee/i);
            await userEvent.type(employeeInput, 'John');
            
            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });
            
            const employeeOption = screen.getByText('John Doe');
            await userEvent.click(employeeOption);

            const submitButton = screen.getByRole('button', { name: /create policy/i });
            await userEvent.click(submitButton);

            await waitFor(() => {
                expect(mockOnSubmit).toHaveBeenCalled();
            });

            // Form should remain enabled after error
            expect(submitButton).not.toBeDisabled();
        });
    });

    describe('Loading States', () => {
        it('should disable form when loading', () => {
            renderWithProviders(
                <PolicyForm 
                    onSubmit={mockOnSubmit}
                    loading={true}
                />
            );

            const submitButton = screen.getByRole('button', { name: /saving/i });
            expect(submitButton).toBeDisabled();

            const backButton = screen.getByRole('button', { name: /back/i });
            expect(backButton).toBeDisabled();
        });

        it('should show loading text on submit button when loading', () => {
            renderWithProviders(
                <PolicyForm 
                    onSubmit={mockOnSubmit}
                    loading={true}
                />
            );

            expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
        });
    });

    describe('Navigation', () => {
        it('should call onCancel when back button is clicked', async () => {
            renderWithProviders(
                <PolicyForm 
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            const backButton = screen.getByRole('button', { name: /back/i });
            await userEvent.click(backButton);

            expect(mockOnCancel).toHaveBeenCalled();
        });
    });

    describe('Policy Summary', () => {
        it('should display policy summary with selected values', async () => {
            renderWithProviders(
                <PolicyForm onSubmit={mockOnSubmit} />
            );

            // Select employee
            const employeeInput = screen.getByLabelText(/employee/i);
            await userEvent.type(employeeInput, 'John');
            
            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });
            
            const employeeOption = screen.getByText('John Doe');
            await userEvent.click(employeeOption);

            // Check summary section
            const summarySection = screen.getByText('Policy Summary').closest('div');
            expect(summarySection).toContainElement(screen.getByText('John Doe'));
        });

        it('should update summary when form values change', async () => {
            renderWithProviders(
                <PolicyForm onSubmit={mockOnSubmit} />
            );

            // Change policy type
            const policyTypeSelect = screen.getByLabelText(/policy type/i);
            await userEvent.click(policyTypeSelect);
            const catAOption = screen.getAllByText(/Category A/)[0];
            await userEvent.click(catAOption);

            // Check summary reflects the change
            const summarySection = screen.getByText('Policy Summary').closest('div');
            expect(summarySection).toContainElement(screen.getAllByText('Category A')[1]);
        });
    });
});
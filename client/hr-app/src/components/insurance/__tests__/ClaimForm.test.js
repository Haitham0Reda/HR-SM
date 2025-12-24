/**
 * ClaimForm Component Tests
 * 
 * Tests for ClaimForm file upload, workflow, and validation.
 * Validates: Requirements 5.3
 */

import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import ClaimForm from '../ClaimForm';
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

// Mock policy data
const mockPolicies = [
    {
        _id: 'policy1',
        policyNumber: 'INS-2024-001',
        policyType: 'CAT_C',
        coverageAmount: 200000,
        employee: {
            _id: 'emp1',
            name: 'John Doe'
        }
    },
    {
        _id: 'policy2',
        policyNumber: 'INS-2024-002',
        policyType: 'CAT_B',
        coverageAmount: 150000,
        employee: {
            _id: 'emp2',
            name: 'Jane Smith'
        }
    }
];

// Mock file for testing
const createMockFile = (name, size, type) => {
    const file = new File(['test content'], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
};

describe('ClaimForm Component', () => {
    const mockOnSubmit = jest.fn();
    const mockOnCancel = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock the policy search to return results immediately
        insuranceService.getAllPolicies.mockImplementation((params) => {
            if (params && params.search && params.search.includes('INS')) {
                return Promise.resolve({
                    data: mockPolicies
                });
            }
            return Promise.resolve({ data: [] });
        });
        
        // Mock URL.createObjectURL and URL.revokeObjectURL
        global.URL.createObjectURL = jest.fn(() => 'mock-url');
        global.URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
        cleanup();
    });

    describe('Form Rendering', () => {
        it('should render all required form fields', () => {
            renderWithProviders(
                <ClaimForm onSubmit={mockOnSubmit} />
            );

            // Check for policy selection
            expect(screen.getByLabelText(/policy/i)).toBeInTheDocument();
            
            // Check for claim details
            expect(screen.getByLabelText(/claim type/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/claim amount/i)).toBeInTheDocument();
            expect(screen.getByRole('group', { name: /claim date/i })).toBeInTheDocument();
            expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
            
            // Check for file upload
            expect(screen.getByText(/upload documents/i)).toBeInTheDocument();
            
            // Check for buttons
            expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /submit claim/i })).toBeInTheDocument();
        });

        it('should render with initial values when provided', () => {
            const initialValues = {
                claimType: 'death',
                claimAmount: 50000,
                description: 'Test claim description'
            };

            renderWithProviders(
                <ClaimForm 
                    onSubmit={mockOnSubmit}
                    initialValues={initialValues}
                />
            );

            expect(screen.getByDisplayValue('Test claim description')).toBeInTheDocument();
        });

        it('should show edit mode UI when isEditMode is true', () => {
            renderWithProviders(
                <ClaimForm 
                    onSubmit={mockOnSubmit}
                    isEditMode={true}
                />
            );

            expect(screen.getByRole('button', { name: /update claim/i })).toBeInTheDocument();
        });
    });

    describe('Form Validation', () => {
        it('should show validation errors for required fields', async () => {
            renderWithProviders(
                <ClaimForm onSubmit={mockOnSubmit} />
            );

            // Try to submit without filling required fields
            const submitButton = screen.getByRole('button', { name: /submit claim/i });
            await userEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/policy is required/i)).toBeInTheDocument();
                expect(screen.getByText(/claim amount must be greater than 0/i)).toBeInTheDocument();
                expect(screen.getByText(/description must be at least 10 characters/i)).toBeInTheDocument();
                expect(screen.getByText(/at least one supporting document is required/i)).toBeInTheDocument();
            });

            // Verify onSubmit was not called
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });

        it('should validate claim amount is positive', async () => {
            renderWithProviders(
                <ClaimForm onSubmit={mockOnSubmit} />
            );

            const claimAmountInput = screen.getByLabelText(/claim amount/i);
            await userEvent.clear(claimAmountInput);
            await userEvent.type(claimAmountInput, '-1000');

            const submitButton = screen.getByRole('button', { name: /submit claim/i });
            await userEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/claim amount must be greater than 0/i)).toBeInTheDocument();
            });
        });

        it('should validate description minimum length', async () => {
            renderWithProviders(
                <ClaimForm onSubmit={mockOnSubmit} />
            );

            const descriptionInput = screen.getByLabelText(/description/i);
            await userEvent.type(descriptionInput, 'Short');

            const submitButton = screen.getByRole('button', { name: /submit claim/i });
            await userEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/description must be at least 10 characters/i)).toBeInTheDocument();
            });
        });

        it('should require at least one document for new claims', async () => {
            renderWithProviders(
                <ClaimForm onSubmit={mockOnSubmit} />
            );

            // Fill in other required fields but no documents
            const policyInput = screen.getByLabelText(/policy/i);
            await userEvent.type(policyInput, 'INS');
            
            await waitFor(() => {
                expect(screen.getByText(/INS-2024-001/)).toBeInTheDocument();
            });
            
            const policyOption = screen.getByText(/INS-2024-001/);
            await userEvent.click(policyOption);

            const claimTypeSelect = screen.getByLabelText(/claim type/i);
            await userEvent.click(claimTypeSelect);
            const deathOption = screen.getByText(/Death Benefit/);
            await userEvent.click(deathOption);

            const claimAmountInput = screen.getByLabelText(/claim amount/i);
            await userEvent.type(claimAmountInput, '50000');

            const descriptionInput = screen.getByLabelText(/description/i);
            await userEvent.type(descriptionInput, 'This is a valid description with more than 10 characters');

            const submitButton = screen.getByRole('button', { name: /submit claim/i });
            await userEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/at least one supporting document is required/i)).toBeInTheDocument();
            });
        });
    });

    describe('Policy Search', () => {
        it('should search policies when typing in policy field', async () => {
            renderWithProviders(
                <ClaimForm onSubmit={mockOnSubmit} />
            );

            const policyInput = screen.getByLabelText(/policy/i);
            await userEvent.type(policyInput, 'INS');

            await waitFor(() => {
                expect(insuranceService.getAllPolicies).toHaveBeenCalledWith({
                    search: 'INS',
                    status: 'active'
                });
            });
        });

        it('should display policy search results', async () => {
            renderWithProviders(
                <ClaimForm onSubmit={mockOnSubmit} />
            );

            const policyInput = screen.getByLabelText(/policy/i);
            await userEvent.type(policyInput, 'INS');

            await waitFor(() => {
                expect(screen.getByText('INS-2024-001 - John Doe')).toBeInTheDocument();
                expect(screen.getByText('INS-2024-002 - Jane Smith')).toBeInTheDocument();
            });
        });

        it('should select policy from search results', async () => {
            renderWithProviders(
                <ClaimForm onSubmit={mockOnSubmit} />
            );

            const policyInput = screen.getByLabelText(/policy/i);
            await userEvent.type(policyInput, 'INS');

            await waitFor(() => {
                expect(screen.getByText('INS-2024-001 - John Doe')).toBeInTheDocument();
            });

            const policyOption = screen.getByText('INS-2024-001 - John Doe');
            await userEvent.click(policyOption);

            expect(policyInput).toHaveValue('INS-2024-001 - John Doe');
        });

        it('should disable policy selection in edit mode', () => {
            const initialValues = {
                policy: mockPolicies[0]
            };

            renderWithProviders(
                <ClaimForm 
                    onSubmit={mockOnSubmit}
                    isEditMode={true}
                    initialValues={initialValues}
                />
            );

            const policyInput = screen.getByLabelText(/policy/i);
            expect(policyInput).toBeDisabled();
        });
    });

    describe('File Upload', () => {
        it('should handle file upload', async () => {
            renderWithProviders(
                <ClaimForm onSubmit={mockOnSubmit} />
            );

            const file = createMockFile('test.pdf', 1024 * 1024, 'application/pdf'); // 1MB PDF
            const fileInput = screen.getByText(/upload documents/i).parentElement.querySelector('input[type="file"]');

            await userEvent.upload(fileInput, file);

            await waitFor(() => {
                expect(screen.getByText('test.pdf')).toBeInTheDocument();
            });
        });

        it('should display uploaded file information', async () => {
            renderWithProviders(
                <ClaimForm onSubmit={mockOnSubmit} />
            );

            const file = createMockFile('document.pdf', 2 * 1024 * 1024, 'application/pdf'); // 2MB PDF
            const fileInput = screen.getByText(/upload documents/i).parentElement.querySelector('input[type="file"]');

            await userEvent.upload(fileInput, file);

            await waitFor(() => {
                expect(screen.getByText('document.pdf')).toBeInTheDocument();
            });
        });

        it('should allow removing uploaded files', async () => {
            renderWithProviders(
                <ClaimForm onSubmit={mockOnSubmit} />
            );

            const file = createMockFile('test.pdf', 1024 * 1024, 'application/pdf');
            const fileInput = screen.getByText(/upload documents/i).parentElement.querySelector('input[type="file"]');

            await userEvent.upload(fileInput, file);

            await waitFor(() => {
                expect(screen.getByText('test.pdf')).toBeInTheDocument();
            });

            const deleteButton = screen.getByRole('button', { name: /delete/i });
            await userEvent.click(deleteButton);

            await waitFor(() => {
                expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
            });
        });

        it('should validate file size limits', async () => {
            // Mock alert
            window.alert = jest.fn();
            
            renderWithProviders(
                <ClaimForm onSubmit={mockOnSubmit} />
            );

            const largeFile = createMockFile('large.pdf', 15 * 1024 * 1024, 'application/pdf'); // 15MB (over 10MB limit)
            const fileInput = screen.getByText(/upload documents/i).parentElement.querySelector('input[type="file"]');

            await userEvent.upload(fileInput, largeFile);

            expect(window.alert).toHaveBeenCalledWith(
                expect.stringContaining('File large.pdf is too large. Maximum size is 10MB.')
            );
        });

        it('should validate file types', async () => {
            // Mock alert
            window.alert = jest.fn();
            
            renderWithProviders(
                <ClaimForm onSubmit={mockOnSubmit} />
            );

            const invalidFile = createMockFile('test.txt', 1024, 'text/plain'); // Invalid type
            const fileInput = screen.getByText(/upload documents/i).parentElement.querySelector('input[type="file"]');

            await userEvent.upload(fileInput, invalidFile);

            expect(window.alert).toHaveBeenCalledWith(
                expect.stringContaining('File test.txt has an unsupported format')
            );
        });

        it('should accept valid file types', async () => {
            renderWithProviders(
                <ClaimForm onSubmit={mockOnSubmit} />
            );

            const validFiles = [
                createMockFile('image.jpg', 1024 * 1024, 'image/jpeg'),
                createMockFile('image.png', 1024 * 1024, 'image/png'),
                createMockFile('document.pdf', 1024 * 1024, 'application/pdf'),
                createMockFile('document.doc', 1024 * 1024, 'application/msword'),
                createMockFile('document.docx', 1024 * 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
            ];

            const fileInput = screen.getByText(/upload documents/i).parentElement.querySelector('input[type="file"]');

            for (const file of validFiles) {
                await userEvent.upload(fileInput, file);
                
                await waitFor(() => {
                    expect(screen.getByText(file.name)).toBeInTheDocument();
                });
            }
        });
    });

    describe('Form Submission', () => {
        it('should submit form with valid data and files', async () => {
            renderWithProviders(
                <ClaimForm onSubmit={mockOnSubmit} />
            );

            // Fill in required fields
            const policyInput = screen.getByLabelText(/policy/i);
            await userEvent.type(policyInput, 'INS');
            
            // Wait for policy options to appear and select one
            await waitFor(() => {
                const policyOption = screen.queryByText('INS-2024-001 - John Doe');
                if (policyOption) {
                    userEvent.click(policyOption);
                }
            }, { timeout: 1000 });

            const claimTypeSelect = screen.getByLabelText(/claim type/i);
            await userEvent.click(claimTypeSelect);
            
            // Wait for dropdown options to appear
            await waitFor(() => {
                const medicalOption = screen.queryByText('Medical Expenses');
                if (medicalOption) {
                    userEvent.click(medicalOption);
                }
            }, { timeout: 1000 });

            const claimAmountInput = screen.getByLabelText(/claim amount/i);
            await userEvent.type(claimAmountInput, '25000');

            const descriptionInput = screen.getByLabelText(/description/i);
            await userEvent.type(descriptionInput, 'Medical expenses for treatment of injury sustained at work');

            // Upload a file
            const file = createMockFile('medical-report.pdf', 1024 * 1024, 'application/pdf');
            const fileInput = screen.getByText(/upload documents/i).parentElement.querySelector('input[type="file"]');
            await userEvent.upload(fileInput, file);

            // Submit the form
            const submitButton = screen.getByRole('button', { name: /submit claim/i });
            await userEvent.click(submitButton);

            // Verify onSubmit was called (basic check)
            await waitFor(() => {
                expect(mockOnSubmit).toHaveBeenCalled();
            }, { timeout: 1000 });
        }, 10000);

        it('should handle submission errors gracefully', async () => {
            mockOnSubmit.mockRejectedValue(new Error('Submission failed'));
            
            renderWithProviders(
                <ClaimForm onSubmit={mockOnSubmit} />
            );

            // Fill in minimal required fields
            const claimAmountInput = screen.getByLabelText(/claim amount/i);
            await userEvent.type(claimAmountInput, '50000');

            const descriptionInput = screen.getByLabelText(/description/i);
            await userEvent.type(descriptionInput, 'Valid description with sufficient length');

            // Upload a file
            const file = createMockFile('document.pdf', 1024 * 1024, 'application/pdf');
            const fileInput = screen.getByText(/upload documents/i).parentElement.querySelector('input[type="file"]');
            await userEvent.upload(fileInput, file);

            const submitButton = screen.getByRole('button', { name: /submit claim/i });
            await userEvent.click(submitButton);

            // Form should remain enabled after error
            await waitFor(() => {
                expect(submitButton).not.toBeDisabled();
            }, { timeout: 1000 });
        }, 10000);
    });

    describe('Loading States', () => {
        it('should disable form when loading', () => {
            renderWithProviders(
                <ClaimForm 
                    onSubmit={mockOnSubmit}
                    loading={true}
                />
            );

            const submitButton = screen.getByRole('button', { name: /submitting/i });
            expect(submitButton).toBeDisabled();

            const backButton = screen.getByRole('button', { name: /back/i });
            expect(backButton).toBeDisabled();
        });

        it('should show loading text on submit button when loading', () => {
            renderWithProviders(
                <ClaimForm 
                    onSubmit={mockOnSubmit}
                    loading={true}
                />
            );

            expect(screen.getByRole('button', { name: /submitting/i })).toBeInTheDocument();
        });
    });

    describe('Navigation', () => {
        it('should call onCancel when back button is clicked', async () => {
            renderWithProviders(
                <ClaimForm 
                    onSubmit={mockOnSubmit}
                    onCancel={mockOnCancel}
                />
            );

            const backButton = screen.getByRole('button', { name: /back/i });
            await userEvent.click(backButton);

            expect(mockOnCancel).toHaveBeenCalled();
        });
    });

    describe('Claim Types', () => {
        it('should display all available claim types', async () => {
            renderWithProviders(
                <ClaimForm onSubmit={mockOnSubmit} />
            );

            const claimTypeSelect = screen.getByLabelText(/claim type/i);
            await userEvent.click(claimTypeSelect);

            expect(screen.getByText('Death Benefit')).toBeInTheDocument();
            expect(screen.getByText('Disability')).toBeInTheDocument();
            expect(screen.getAllByText('Medical Expenses')[1]).toBeInTheDocument(); // Get the option, not the default selected value
            expect(screen.getByText('Other')).toBeInTheDocument();
        });

        it('should select claim type correctly', async () => {
            renderWithProviders(
                <ClaimForm onSubmit={mockOnSubmit} />
            );

            const claimTypeSelect = screen.getByLabelText(/claim type/i);
            await userEvent.click(claimTypeSelect);

            const disabilityOption = screen.getByText('Disability');
            await userEvent.click(disabilityOption);

            expect(screen.getByDisplayValue('disability')).toBeInTheDocument();
        });
    });
});
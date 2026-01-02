import * as React from 'react';
import { useNavigate } from 'react-router';
import { useCompanyRouting } from '../hooks/useCompanyRouting';
import useNotifications from '../hooks/useNotifications/useNotifications';
import {
    createOne as createEmployee,
    validate as validateEmployee,
} from '../data/employees';
import EmployeeForm from './EmployeeForm';
import PageContainer from './PageContainer';

const INITIAL_FORM_VALUES = {
    username: '',
    email: '',
    password: '',
    role: 'employee',
    profile: {
        firstName: '',
        medName: '',
        lastName: '',
        arabicName: '',
        phone: '',
        dateOfBirth: null,
        gender: 'male',
        nationalId: '',
        nationality: '',
        profilePicture: ''
    },
    department: '',
    position: '',
    employment: {
        hireDate: null,
        contractType: 'fulltime',
        employmentStatus: 'active'
    },
    category: '',
    section: '',
    supervisor: '',
    alternativeSupervisor: '',
    allowResearch: false,
    includeInAttendance: true,
    isActive: true
};

export default function EmployeeCreate() {
    const navigate = useNavigate();

    const notifications = useNotifications();

    const [formState, setFormState] = React.useState(() => ({
        values: INITIAL_FORM_VALUES,
        errors: {},
    }));
    const formValues = formState.values;
    const formErrors = formState.errors;

    const setFormValues = React.useCallback((newFormValues) => {
        setFormState((previousState) => ({
            ...previousState,
            values: newFormValues,
        }));
    }, []);

    const setFormErrors = React.useCallback((newFormErrors) => {
        setFormState((previousState) => ({
            ...previousState,
            errors: newFormErrors,
        }));
    }, []);

    const handleFormFieldChange = React.useCallback(
        (name, value) => {
            const validateField = async (values) => {
                const { issues } = validateEmployee(values);
                setFormErrors({
                    ...formErrors,
                    [name]: issues?.find((issue) => issue.path?.[0] === name)?.message,
                });
            };

            const newFormValues = { ...formValues, [name]: value };

            setFormValues(newFormValues);
            validateField(newFormValues);
        },
        [formValues, formErrors, setFormErrors, setFormValues],
    );

    const handleFormReset = React.useCallback(() => {
        setFormValues(INITIAL_FORM_VALUES);
    }, [setFormValues]);

    const handleFormSubmit = React.useCallback(async () => {
        const { issues } = validateEmployee(formValues);
        if (issues && issues.length > 0) {
            setFormErrors(
                Object.fromEntries(issues.map((issue) => [issue.path?.[0], issue.message])),
            );
            return;
        }
        setFormErrors({});

        try {
            const response = await createEmployee(formValues);
            
            // Check if email was auto-generated
            let successMessage = 'Employee created successfully.';
            if (response.message && response.message.includes('Email auto-generated')) {
                const emailMatch = response.message.match(/Email auto-generated: (.+)/);
                if (emailMatch) {
                    successMessage = `Employee created successfully. Email auto-generated: ${emailMatch[1]}`;
                }
            }
            
            notifications.show(successMessage, {
                severity: 'success',
                autoHideDuration: 5000, // Longer duration for auto-generated email message
            });

            navigate(getCompanyRoute('/users'));
        } catch (createError) {
            let errorMessage = `Failed to create employee. Reason: ${createError.message}`;
            
            // Handle specific email generation errors
            if (createError.message.includes('email domain not configured')) {
                errorMessage = 'Failed to create employee: Company email domain not configured. Please contact administrator.';
            } else if (createError.message.includes('Failed to generate email')) {
                errorMessage = 'Failed to create employee: Unable to generate unique email address. Please provide an email manually.';
            }
            
            notifications.show(errorMessage, {
                severity: 'error',
                autoHideDuration: 6000,
            });
            throw createError;
        }
    }, [formValues, navigate, notifications, setFormErrors]);

    const handleCancel = () => {
        const { getCompanyRoute } = useCompanyRouting();
        navigate(getCompanyRoute('/users'));
    };

    const { getCompanyRoute } = useCompanyRouting();

    return (
        <PageContainer
            title="New Employee"
            breadcrumbs={[{ title: 'Employees', path: getCompanyRoute('/users') }, { title: 'New' }]}
        >
            <EmployeeForm
                formState={formState}
                onFieldChange={handleFormFieldChange}
                onSubmit={handleFormSubmit}
                onReset={handleFormReset}
                submitButtonLabel="Create"
            />
        </PageContainer>
    );
}

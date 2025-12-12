// src/data/employees.js
// Example employee data. Replace with real data or API integration.
export const employees = [
    {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        position: 'Developer',
        department: 'Information Technology',
    },
    // Add more employees as needed
];

// CRUD and validation functions for employees
export function validateEmployee(employee) {
    // Example validation
    return employee && employee.name && employee.email;
}
export function createEmployee(employee) {
    employees.push(employee);
    return employee;
}
export function getEmployee(id) {
    return employees.find(e => e.id === id);
}
export function updateEmployee(id, data) {
    const idx = employees.findIndex(e => e.id === id);
    if (idx !== -1) {
        employees[idx] = { ...employees[idx], ...data };
        return employees[idx];
    }
    return null;
}
export function deleteEmployee(id) {
    const idx = employees.findIndex(e => e.id === id);
    if (idx !== -1) {
        return employees.splice(idx, 1)[0];
    }
    return null;
}
export function getEmployees() {
    return employees;
}

// Aliases for compatibility with component imports
export { validateEmployee as validate };
export { createEmployee as createOne };
export { getEmployee as getOne };
export { updateEmployee as updateOne };
export { deleteEmployee as deleteOne };
export { getEmployees as getMany };

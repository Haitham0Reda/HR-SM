import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Email Templates', () => {
  let templates = {};

  beforeAll(async () => {
    // Load templates from the email-service module
    const templatesDir = path.join(__dirname, '../../../modules/email-service/templates');
    const files = await fs.readdir(templatesDir);

    for (const file of files) {
      if (file.endsWith('.hbs')) {
        const templateName = file.replace('.hbs', '');
        const templatePath = path.join(templatesDir, file);
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        const compiledTemplate = Handlebars.compile(templateContent);
        templates[templateName] = compiledTemplate;
      }
    }
  });

  describe('Overtime Request Template', () => {
    test('should substitute all variables correctly', () => {
      const variables = {
        approverName: 'John Manager',
        employeeName: 'Jane Employee',
        department: 'Engineering',
        date: '2025-12-15',
        hours: '4',
        reason: 'Critical project deadline',
        actionUrl: 'https://hr.company.com/requests/123'
      };

      const result = templates.overtimeRequest(variables);

      expect(result).toContain('Hello John Manager');
      expect(result).toContain('Jane Employee');
      expect(result).toContain('Engineering');
      expect(result).toContain('2025-12-15');
      expect(result).toContain('4');
      expect(result).toContain('Critical project deadline');
      expect(result).toContain('https://hr.company.com/requests/123');
    });

    test('should handle missing optional variables gracefully', () => {
      const variables = {
        approverName: 'John Manager',
        employeeName: 'Jane Employee',
        department: 'Engineering',
        date: '2025-12-15',
        hours: '4'
        // reason and actionUrl are missing
      };

      const result = templates.overtimeRequest(variables);

      expect(result).toContain('Hello John Manager');
      expect(result).toContain('Jane Employee');
      expect(result).toContain('Engineering');
      expect(result).toContain('2025-12-15');
      expect(result).toContain('4');
      // Should not contain reason section when reason is missing
      expect(result).not.toContain('Reason:');
      // Should not contain action button when actionUrl is missing
      expect(result).not.toContain('Review Request');
    });

    test('should handle empty variables gracefully', () => {
      const variables = {
        approverName: '',
        employeeName: '',
        department: '',
        date: '',
        hours: '',
        reason: '',
        actionUrl: ''
      };

      const result = templates.overtimeRequest(variables);

      // Template should render without errors even with empty values
      expect(result).toBeDefined();
      expect(result).toContain('Hello ');
      expect(result).toContain('Employee:');
      expect(result).toContain('Department:');
      expect(result).toContain('Date:');
      expect(result).toContain('Hours:');
    });

    test('should handle undefined variables gracefully', () => {
      const variables = {
        approverName: 'John Manager',
        employeeName: 'Jane Employee'
        // Other variables are undefined
      };

      const result = templates.overtimeRequest(variables);

      expect(result).toContain('Hello John Manager');
      expect(result).toContain('Jane Employee');
      // Should render without throwing errors
      expect(result).toBeDefined();
    });
  });

  describe('Task Assignment Template', () => {
    test('should substitute all variables correctly', () => {
      const variables = {
        assigneeName: 'Alice Developer',
        assignerName: 'Bob Manager',
        taskTitle: 'Implement user authentication',
        priority: 'high',
        dueDate: '2025-12-20',
        project: 'HR System v2',
        category: 'Development',
        description: 'Implement JWT-based authentication system with role-based access control',
        actionUrl: 'https://hr.company.com/tasks/456'
      };

      const result = templates.taskAssignment(variables);

      expect(result).toContain('Hello Alice Developer');
      expect(result).toContain('Bob Manager');
      expect(result).toContain('Implement user authentication');
      expect(result).toContain('priority-high');
      expect(result).toContain('2025-12-20');
      expect(result).toContain('HR System v2');
      expect(result).toContain('Development');
      expect(result).toContain('Implement JWT-based authentication system');
      expect(result).toContain('https://hr.company.com/tasks/456');
    });

    test('should handle different priority levels correctly', () => {
      const testPriorities = ['high', 'medium', 'low'];

      testPriorities.forEach(priority => {
        const variables = {
          assigneeName: 'Alice Developer',
          assignerName: 'Bob Manager',
          taskTitle: 'Test Task',
          priority: priority,
          dueDate: '2025-12-20'
        };

        const result = templates.taskAssignment(variables);

        expect(result).toContain(`priority-${priority}`);
        expect(result).toContain(priority);
      });
    });

    test('should handle missing optional variables gracefully', () => {
      const variables = {
        assigneeName: 'Alice Developer',
        assignerName: 'Bob Manager',
        taskTitle: 'Basic Task',
        priority: 'medium',
        dueDate: '2025-12-20'
        // project, category, description, actionUrl are missing
      };

      const result = templates.taskAssignment(variables);

      expect(result).toContain('Hello Alice Developer');
      expect(result).toContain('Bob Manager');
      expect(result).toContain('Basic Task');
      expect(result).toContain('priority-medium');
      expect(result).toContain('2025-12-20');
      // Should not contain optional sections when variables are missing
      expect(result).not.toContain('Project:');
      expect(result).not.toContain('Category:');
      expect(result).not.toContain('Description:');
      expect(result).not.toContain('View Task');
    });

    test('should handle empty description gracefully', () => {
      const variables = {
        assigneeName: 'Alice Developer',
        assignerName: 'Bob Manager',
        taskTitle: 'Task with empty description',
        priority: 'low',
        dueDate: '2025-12-20',
        description: ''
      };

      const result = templates.taskAssignment(variables);

      expect(result).toContain('Alice Developer');
      expect(result).toContain('Task with empty description');
      // Should not show description section when empty
      expect(result).not.toContain('Description:');
    });
  });

  describe('Vacation Approval Template', () => {
    test('should substitute all variables correctly for approved vacation', () => {
      const variables = {
        employeeName: 'Sarah Employee',
        approved: true,
        startDate: '2025-12-23',
        endDate: '2025-12-30',
        duration: '7',
        vacationType: 'Annual Leave',
        remainingBalance: '15',
        comments: 'Enjoy your vacation!',
        actionUrl: 'https://hr.company.com/vacations/789'
      };

      const result = templates.vacationApproval(variables);

      expect(result).toContain('Hello Sarah Employee');
      expect(result).toContain('APPROVED');
      expect(result).toContain('2025-12-23');
      expect(result).toContain('2025-12-30');
      expect(result).toContain('7 days');
      expect(result).toContain('Annual Leave');
      expect(result).toContain('15 days');
      expect(result).toContain('Enjoy your vacation!');
      expect(result).toContain('https://hr.company.com/vacations/789');
      expect(result).toContain('#4CAF50'); // Green color for approved
    });

    test('should substitute all variables correctly for rejected vacation', () => {
      const variables = {
        employeeName: 'Sarah Employee',
        approved: false,
        startDate: '2025-12-23',
        endDate: '2025-12-30',
        duration: '7',
        vacationType: 'Annual Leave',
        comments: 'Insufficient coverage during this period',
        actionUrl: 'https://hr.company.com/vacations/789'
      };

      const result = templates.vacationApproval(variables);

      expect(result).toContain('Hello Sarah Employee');
      expect(result).toContain('REJECTED');
      expect(result).toContain('2025-12-23');
      expect(result).toContain('2025-12-30');
      expect(result).toContain('7 days');
      expect(result).toContain('Annual Leave');
      expect(result).toContain('Insufficient coverage during this period');
      expect(result).toContain('https://hr.company.com/vacations/789');
      expect(result).toContain('#f44336'); // Red color for rejected
      // Should not contain remaining balance for rejected requests
      expect(result).not.toContain('Remaining Balance:');
    });

    test('should handle conditional styling based on approval status', () => {
      const approvedVariables = {
        employeeName: 'John Doe',
        approved: true,
        startDate: '2025-12-23',
        endDate: '2025-12-30',
        duration: '7',
        vacationType: 'Annual Leave'
      };

      const rejectedVariables = {
        ...approvedVariables,
        approved: false
      };

      const approvedResult = templates.vacationApproval(approvedVariables);
      const rejectedResult = templates.vacationApproval(rejectedVariables);

      // Check header colors
      expect(approvedResult).toContain('#4CAF50'); // Green for approved
      expect(rejectedResult).toContain('#f44336'); // Red for rejected

      // Check status text
      expect(approvedResult).toContain('Vacation Request Approved');
      expect(rejectedResult).toContain('Vacation Request Rejected');

      // Check status badge
      expect(approvedResult).toContain('APPROVED');
      expect(rejectedResult).toContain('REJECTED');
    });

    test('should handle missing optional variables gracefully', () => {
      const variables = {
        employeeName: 'Sarah Employee',
        approved: true,
        startDate: '2025-12-23',
        endDate: '2025-12-30',
        duration: '7',
        vacationType: 'Annual Leave'
        // remainingBalance, comments, actionUrl are missing
      };

      const result = templates.vacationApproval(variables);

      expect(result).toContain('Hello Sarah Employee');
      expect(result).toContain('APPROVED');
      expect(result).toContain('2025-12-23');
      expect(result).toContain('2025-12-30');
      expect(result).toContain('7 days');
      expect(result).toContain('Annual Leave');
      // Remaining Balance section shows for approved requests even if value is missing (shows empty)
      expect(result).toContain('Remaining Balance:');
      // Should not contain optional sections when variables are missing
      expect(result).not.toContain('Comments:');
      expect(result).not.toContain('View Details');
    });

    test('should handle boolean values correctly', () => {
      const trueVariables = {
        employeeName: 'Test User',
        approved: true,
        startDate: '2025-12-23',
        endDate: '2025-12-30',
        duration: '7',
        vacationType: 'Annual Leave'
      };

      const falseVariables = {
        ...trueVariables,
        approved: false
      };

      const trueResult = templates.vacationApproval(trueVariables);
      const falseResult = templates.vacationApproval(falseVariables);

      expect(trueResult).toContain('APPROVED');
      expect(falseResult).toContain('REJECTED');
    });
  });

  describe('Template Error Handling', () => {
    test('should handle completely empty variables object', () => {
      const emptyVariables = {};

      // All templates should render without throwing errors
      expect(() => templates.overtimeRequest(emptyVariables)).not.toThrow();
      expect(() => templates.taskAssignment(emptyVariables)).not.toThrow();
      expect(() => templates.vacationApproval(emptyVariables)).not.toThrow();
    });

    test('should handle null variables object', () => {
      const nullVariables = null;

      // Templates should handle null gracefully
      expect(() => templates.overtimeRequest(nullVariables)).not.toThrow();
      expect(() => templates.taskAssignment(nullVariables)).not.toThrow();
      expect(() => templates.vacationApproval(nullVariables)).not.toThrow();
    });

    test('should handle undefined variables object', () => {
      const undefinedVariables = undefined;

      // Templates should handle undefined gracefully
      expect(() => templates.overtimeRequest(undefinedVariables)).not.toThrow();
      expect(() => templates.taskAssignment(undefinedVariables)).not.toThrow();
      expect(() => templates.vacationApproval(undefinedVariables)).not.toThrow();
    });

    test('should handle special characters in variables', () => {
      const specialCharVariables = {
        employeeName: 'José María O\'Connor <test@example.com>',
        approverName: 'Manager & Director',
        taskTitle: 'Fix "critical" bug & update docs',
        reason: 'Emergency: system down! Need immediate action.',
        comments: 'Please review ASAP - contains <script>alert("test")</script>'
      };

      const overtimeResult = templates.overtimeRequest(specialCharVariables);
      const taskResult = templates.taskAssignment(specialCharVariables);
      const vacationResult = templates.vacationApproval({
        ...specialCharVariables,
        approved: true,
        startDate: '2025-12-23',
        endDate: '2025-12-30',
        duration: '7',
        vacationType: 'Annual Leave'
      });

      // Should contain the special characters (Handlebars escapes HTML by default)
      expect(overtimeResult).toContain('José María O&#x27;Connor'); // HTML-escaped apostrophe
      expect(taskResult).toContain('Fix &quot;critical&quot; bug'); // HTML-escaped quotes
      expect(vacationResult).toContain('Please review ASAP');
      
      // Should not contain unescaped script tags (should be HTML-escaped)
      expect(vacationResult).not.toContain('<script>alert("test")</script>');
      expect(vacationResult).toContain('&lt;script&gt;'); // Should contain escaped version
    });
  });

  describe('Template Structure Validation', () => {
    test('should generate valid HTML structure', () => {
      const testVariables = {
        employeeName: 'Test User',
        approverName: 'Test Manager',
        assigneeName: 'Test Assignee',
        assignerName: 'Test Assigner',
        taskTitle: 'Test Task',
        priority: 'medium',
        dueDate: '2025-12-20',
        approved: true,
        startDate: '2025-12-23',
        endDate: '2025-12-30',
        duration: '7',
        vacationType: 'Annual Leave'
      };

      const templates_to_test = [
        { name: 'overtimeRequest', variables: testVariables },
        { name: 'taskAssignment', variables: testVariables },
        { name: 'vacationApproval', variables: testVariables }
      ];

      templates_to_test.forEach(({ name, variables }) => {
        const result = templates[name](variables);
        
        // Should contain basic HTML structure
        expect(result).toContain('<!DOCTYPE html>');
        expect(result).toContain('<html>');
        expect(result).toContain('<head>');
        expect(result).toContain('<body>');
        expect(result).toContain('</body>');
        expect(result).toContain('</html>');
        
        // Should contain meta tags
        expect(result).toContain('<meta charset="UTF-8">');
        expect(result).toContain('<meta name="viewport"');
        
        // Should contain CSS styles
        expect(result).toContain('<style>');
        expect(result).toContain('</style>');
      });
    });

    test('should contain required email elements', () => {
      const testVariables = {
        employeeName: 'Test User',
        approverName: 'Test Manager',
        assigneeName: 'Test Assignee',
        assignerName: 'Test Assigner',
        taskTitle: 'Test Task',
        priority: 'medium',
        dueDate: '2025-12-20',
        approved: true,
        startDate: '2025-12-23',
        endDate: '2025-12-30',
        duration: '7',
        vacationType: 'Annual Leave'
      };

      const templates_to_test = [
        'overtimeRequest',
        'taskAssignment', 
        'vacationApproval'
      ];

      templates_to_test.forEach(templateName => {
        const result = templates[templateName](testVariables);
        
        // Should contain footer with automated message disclaimer
        expect(result).toContain('This is an automated message');
        expect(result).toContain('Please do not reply to this email');
        
        // Should have proper email styling
        expect(result).toContain('font-family');
        expect(result).toContain('max-width');
      });
    });
  });
});
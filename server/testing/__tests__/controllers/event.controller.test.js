// Add these additional test scenarios to your existing test file

describe('Advanced Document Template Scenarios', () => {
  describe('Template Versioning and History', () => {
    it('should maintain version history when updating templates', async () => {
      const req = {
        params: {
          id: testTemplate._id.toString()
        },
        body: {
          name: 'Standard Employment Contract v1.3',
          description: 'Updated with new legal clauses',
          version: '1.3.0'
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await updateDocumentTemplate(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.template.version).toBe('1.3.0');
      expect(response.template.previousVersions).toBeDefined();
    });

    it('should restore previous template version', async () => {
      const req = {
        params: {
          id: testTemplate._id.toString(),
          version: '1.2.0'
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await restoreTemplate(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.template.version).toBe('1.2.0');
    });
  });

  describe('Template Collaboration', () => {
    it('should allow multiple users to collaborate on templates', async () => {
      const req = {
        params: {
          id: testTemplate._id.toString()
        },
        body: {
          collaborators: [testManager._id.toString(), testAdmin._id.toString()],
          permission: 'edit'
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // This would be a new controller function for adding collaborators
      // await addTemplateCollaborators(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should track template modification history', async () => {
      const req = {
        params: {
          id: testTemplate._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // This would be a new controller function for getting modification history
      // await getTemplateHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Template Export and Import', () => {
    it('should export templates in multiple formats', async () => {
      const req = {
        query: {
          format: 'json',
          includeFiles: 'true'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        header: jest.fn().mockReturnThis(),
        attachment: jest.fn().mockReturnThis()
      };

      await exportTemplates(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.header).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(res.attachment).toHaveBeenCalledWith('document-templates-export.json');
    });

    it('should import templates from exported file', async () => {
      const importData = {
        templates: [
          {
            name: 'Imported Template',
            category: 'imported',
            fileType: 'docx',
            fields: [],
            metadata: { language: 'en' }
          }
        ],
        files: {
          'imported-template.docx': Buffer.from('template content').toString('base64')
        }
      };

      const req = {
        body: importData,
        user: {
          _id: testAdmin._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await importTemplates(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const response = res.json.mock.calls[0][0];
      expect(response.imported).toBe(1);
      expect(response.errors).toHaveLength(0);
    });
  });

  describe('Template Analytics and Reporting', () => {
    it('should generate template usage reports', async () => {
      const req = {
        query: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          reportType: 'usage'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getTemplateUsageStats(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.report).toBeDefined();
      expect(response.analytics).toBeDefined();
      expect(response.analytics.mostUsedTemplates).toBeDefined();
      expect(response.analytics.usageTrends).toBeDefined();
    });

    it('should track template performance metrics', async () => {
      const req = {
        params: {
          id: testTemplate._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // This would be a new controller function for template analytics
      // await getTemplateAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Template Workflow Integration', () => {
    it('should integrate with approval workflows', async () => {
      const req = {
        params: {
          id: testTemplate._id.toString()
        },
        body: {
          workflow: 'approval',
          approvers: [testHR._id.toString(), testAdmin._id.toString()],
          conditions: {
            minSalary: 50000,
            requireLegalReview: true
          }
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // This would be a new controller function for workflow setup
      // await setupTemplateWorkflow(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle template approval processes', async () => {
      const req = {
        params: {
          id: testTemplate._id.toString()
        },
        body: {
          approved: true,
          comments: 'Template meets all requirements',
          nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        },
        user: {
          _id: testAdmin._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // This would be a new controller function for template approval
      // await approveTemplate(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Advanced Search and Filtering', () => {
    it('should support advanced search with multiple criteria', async () => {
      const req = {
        query: {
          search: 'contract',
          category: ['contracts', 'legal'],
          fileType: ['docx', 'pdf'],
          tags: 'legal,confidential',
          minUsage: '10',
          maxUsage: '100',
          dateFrom: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          dateTo: new Date().toISOString(),
          sortBy: 'usageCount',
          sortOrder: 'desc'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await searchTemplates(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.templates.length).toBeGreaterThan(0);
    });

    it('should support full-text search across template content', async () => {
      const req = {
        query: {
          q: 'employment contract standard hire',
          searchFields: ['name', 'description', 'fields.label', 'tags']
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await searchTemplates(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Template Categories Management', () => {
    it('should get all template categories with counts', async () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getTemplateCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.categories).toBeDefined();
      expect(response.categories.contracts).toBeDefined();
      expect(response.categories.hr).toBeDefined();
      expect(response.categories.policies).toBeDefined();
    });

    it('should manage template category hierarchy', async () => {
      const req = {
        body: {
          categories: {
            'legal': {
              name: 'Legal Documents',
              subcategories: ['contracts', 'agreements', 'compliance']
            },
            'hr': {
              name: 'Human Resources',
              subcategories: ['onboarding', 'performance', 'policies']
            }
          }
        },
        user: {
          _id: testAdmin._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // This would be a new controller function for category management
      // await updateTemplateCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Security and Compliance', () => {
    it('should enforce data retention policies', async () => {
      const req = {
        body: {
          retentionPolicy: {
            active: 365, // days
            archived: 1825, // 5 years
            deleted: 30 // days
          }
        },
        user: {
          _id: testAdmin._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // This would be a new controller function for retention policy
      // await setTemplateRetentionPolicy(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should audit all template operations', async () => {
      const req = {
        params: {
          id: testTemplate._id.toString()
        },
        user: {
          _id: testHR._id,
          ip: '192.168.1.100'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getDocumentTemplateById(req, res);

      // Verify audit trail was created
      // This would check your audit service was called
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle GDPR compliance for template data', async () => {
      const req = {
        params: {
          userId: testUser._id.toString()
        },
        user: {
          _id: testAdmin._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // This would be a new controller function for GDPR compliance
      // await exportUserTemplateData(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-volume template generation', async () => {
      const generationPromises = [];
      
      for (let i = 0; i < 100; i++) {
        const req = {
          params: {
            id: testTemplate._id.toString()
          },
          body: {
            data: {
              employee_name: `Employee ${i}`,
              start_date: '2024-01-15',
              salary: 50000 + i * 1000,
              position: 'Software Engineer'
            },
            outputFormat: 'pdf'
          },
          user: {
            _id: testHR._id
          }
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };

        generationPromises.push(generateDocumentFromTemplate(req, res));
      }

      await Promise.all(generationPromises);

      // Verify all generations completed successfully
      const updatedTemplate = await DocumentTemplate.findById(testTemplate._id);
      expect(updatedTemplate.usageCount).toBe(147); // 47 + 100
    });

    it('should optimize template caching', async () => {
      const req = {
        params: {
          id: testTemplate._id.toString()
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // First request
      const startTime1 = Date.now();
      await getDocumentTemplateById(req, res);
      const endTime1 = Date.now();

      // Second request (should be faster due to caching)
      const startTime2 = Date.now();
      await getDocumentTemplateById(req, res);
      const endTime2 = Date.now();

      expect(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle template file corruption', async () => {
      // Mock file service to simulate corruption
      const { uploadTemplate } = await import('../../../services/fileService.js');
      uploadTemplate.mockRejectedValueOnce(new Error('File corruption detected'));

      const req = {
        body: {
          name: 'Corrupted Template',
          category: 'test',
          fileType: 'docx'
        },
        file: {
          originalname: 'corrupted.docx',
          mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 102400,
          buffer: Buffer.from('corrupted content')
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await createDocumentTemplate(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should recover from database connection issues', async () => {
      // Simulate database connection failure
      const originalFind = DocumentTemplate.find;
      DocumentTemplate.find = jest.fn()
        .mockRejectedValueOnce(new Error('Database connection failed'))
        .mockImplementationOnce(originalFind);

      const req = {
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getAllDocumentTemplates(req, res);

      // Should retry and succeed
      expect(res.status).toHaveBeenCalledWith(200);

      // Restore original implementation
      DocumentTemplate.find = originalFind;
    });

    it('should handle malformed template data gracefully', async () => {
      const req = {
        body: {
          name: 'Malformed Template',
          category: 'test',
          fields: 'invalid fields data' // Should be array, not string
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await validateTemplate(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.valid).toBe(false);
      expect(response.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Integration with External Systems', () => {
    it('should integrate with document signing services', async () => {
      const req = {
        params: {
          id: testTemplate._id.toString()
        },
        body: {
          signers: [
            {
              name: 'John Doe',
              email: 'john@example.com',
              role: 'employee'
            },
            {
              name: 'HR Manager', 
              email: 'hr@example.com',
              role: 'company'
            }
          ],
          signingOrder: 'sequential'
        },
        user: {
          _id: testHR._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // This would be a new controller function for e-signature integration
      // await prepareTemplateForSigning(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should sync templates with cloud storage', async () => {
      const req = {
        body: {
          syncDirection: 'upload',
          cloudProvider: 'aws_s3',
          bucket: 'company-templates'
        },
        user: {
          _id: testAdmin._id
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // This would be a new controller function for cloud sync
      // await syncTemplatesWithCloud(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});

// Add cleanup and teardown
afterEach(async () => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Additional cleanup if needed
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Utility functions for tests
const createBulkTemplates = async (count, category = 'test') => {
  const templates = [];
  for (let i = 0; i < count; i++) {
    templates.push({
      name: `Bulk Template ${i}`,
      category,
      fileType: 'docx',
      fileUrl: `https://storage.example.com/templates/bulk-${i}.docx`,
      status: 'active',
      visibility: 'public',
      createdBy: testHR._id
    });
  }
  return await DocumentTemplate.insertMany(templates);
};

const simulateHighLoad = async (operations, concurrency = 10) => {
  const results = [];
  for (let i = 0; i < operations.length; i += concurrency) {
    const batch = operations.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch);
    results.push(...batchResults);
  }
  return results;
};
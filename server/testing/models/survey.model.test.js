import mongoose from 'mongoose';
import Survey from '../../models/survey.model.js';
import User from '../../models/user.model.js';
import Department from '../../models/department.model.js';

let user;
let manager;
let department;

beforeEach(async () => {
  // Clear surveys collection
  await Survey.deleteMany({});

  department = await Department.create({
    name: 'Test Department',
    code: 'TEST'
  });

  user = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'employee',
    employeeId: 'EMP001',
    department: department._id
  });

  manager = await User.create({
    username: 'testmanager',
    email: 'manager@example.com',
    password: 'password123',
    role: 'manager',
    employeeId: 'MGR001',
    department: department._id
  });
});

describe('Survey Model', () => {
  it('should create a new survey with required fields', async () => {
    const survey = await Survey.create({
      title: 'Employee Satisfaction Survey',
      description: 'Quarterly employee satisfaction survey',
      surveyType: 'satisfaction',
      createdBy: user._id
    });

    expect(survey.title).toBe('Employee Satisfaction Survey');
    expect(survey.description).toBe('Quarterly employee satisfaction survey');
    expect(survey.surveyType).toBe('satisfaction');
    expect(survey.createdBy.toString()).toBe(user._id.toString());
    expect(survey.status).toBe('draft');
  });

  it('should validate surveyType enum values', async () => {
    const validTypes = [
      'satisfaction',
      'training',
      'performance',
      'policy',
      '360-feedback',
      'exit-interview',
      'custom'
    ];

    for (const type of validTypes) {
      const survey = new Survey({
        title: 'Test Survey',
        surveyType: type,
        createdBy: user._id
      });

      await expect(survey.validate()).resolves.toBeUndefined();
    }

    // Test invalid type
    const invalidSurvey = new Survey({
      title: 'Invalid Survey',
      surveyType: 'invalid-type',
      createdBy: user._id
    });

    await expect(invalidSurvey.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate question types', async () => {
    const validQuestionTypes = [
      'text',
      'textarea',
      'single-choice',
      'multiple-choice',
      'rating',
      'yes-no',
      'number',
      'date'
    ];

    for (const questionType of validQuestionTypes) {
      const survey = new Survey({
        title: 'Test Survey',
        createdBy: user._id,
        questions: [{
          questionText: 'Test question?',
          questionType: questionType
        }]
      });

      await expect(survey.validate()).resolves.toBeUndefined();
    }

    // Test invalid question type
    const invalidSurvey = new Survey({
      title: 'Invalid Survey',
      createdBy: user._id,
      questions: [{
        questionText: 'Test question?',
        questionType: 'invalid-type'
      }]
    });

    await expect(invalidSurvey.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate user roles', async () => {
    const validRoles = [
      'admin',
      'hr',
      'manager',
      'employee',
      'id-card-admin',
      'supervisor',
      'head-of-department',
      'dean'
    ];

    for (const role of validRoles) {
      const survey = new Survey({
        title: 'Test Survey',
        createdBy: user._id,
        assignedTo: {
          roles: [role]
        }
      });

      await expect(survey.validate()).resolves.toBeUndefined();
    }

    // Test invalid role
    const invalidSurvey = new Survey({
      title: 'Invalid Survey',
      createdBy: user._id,
      assignedTo: {
        roles: ['invalid-role']
      }
    });

    await expect(invalidSurvey.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should calculate virtual properties correctly', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

    const survey = await Survey.create({
      title: 'Active Survey',
      createdBy: user._id,
      status: 'active',
      settings: {
        startDate: new Date(),
        endDate: futureDate
      }
    });

    expect(survey.isCurrentlyActive).toBe(true);
  });

  it('should handle inactive surveys', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Yesterday

    const survey = await Survey.create({
      title: 'Expired Survey',
      createdBy: user._id,
      status: 'active',
      settings: {
        startDate: new Date(pastDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: pastDate
      }
    });

    expect(survey.isCurrentlyActive).toBe(false);
  });

  it('should check if user has responded', async () => {
    const survey = await Survey.create({
      title: 'Test Survey',
      createdBy: user._id,
      responses: [
        {
          respondent: user._id
        }
      ]
    });

    expect(survey.hasUserResponded(user._id)).toBe(true);
    expect(survey.hasUserResponded(manager._id)).toBe(false);
  });

  it('should get user response', async () => {
    const questionId = new mongoose.Types.ObjectId();
    const answers = [
      {
        questionId: questionId,
        answer: 'Test answer'
      }
    ];

    const survey = await Survey.create({
      title: 'Test Survey',
      createdBy: user._id,
      responses: [
        {
          respondent: user._id,
          answers: answers
        }
      ]
    });

    const userResponse = survey.getUserResponse(user._id);

    expect(userResponse).toBeDefined();
    expect(userResponse.respondent.toString()).toBe(user._id.toString());
    expect(userResponse.answers).toHaveLength(1);
    expect(userResponse.answers[0].questionId.toString()).toBe(questionId.toString());
    expect(userResponse.answers[0].answer).toBe('Test answer');
  });

  it('should calculate completion rate', async () => {
    const survey = await Survey.create({
      title: 'Test Survey',
      createdBy: user._id,
      stats: {
        totalAssigned: 100,
        totalResponses: 25
      }
    });

    const completionRate = survey.calculateCompletionRate();

    expect(completionRate).toBe(25);
    expect(survey.stats.completionRate).toBe(25);
  });

  it('should add response to survey', async () => {
    const questionId = new mongoose.Types.ObjectId();

    const survey = await Survey.create({
      title: 'Test Survey',
      createdBy: user._id,
      questions: [
        {
          _id: questionId,
          questionText: 'Test question?',
          questionType: 'text',
          required: true
        }
      ],
      stats: {
        totalAssigned: 10
      }
    });

    const answers = [
      {
        questionId: questionId,
        answer: 'Test answer'
      }
    ];

    const metadata = {
      ipAddress: '192.168.1.100',
      userAgent: 'Test Browser'
    };

    const updatedSurvey = await survey.addResponse(user._id, answers, false, metadata);

    expect(updatedSurvey.responses).toHaveLength(1);
    expect(updatedSurvey.responses[0].respondent.toString()).toBe(user._id.toString());
    expect(updatedSurvey.responses[0].answers).toHaveLength(1);
    expect(updatedSurvey.responses[0].answers[0].questionId.toString()).toBe(questionId.toString());
    expect(updatedSurvey.responses[0].answers[0].answer).toBe('Test answer');
    expect(updatedSurvey.responses[0].completionPercentage).toBe(100);
    expect(updatedSurvey.responses[0].isComplete).toBe(true);
    expect(updatedSurvey.responses[0].submittedAt).toBeDefined();
    expect(updatedSurvey.responses[0].ipAddress).toBe('192.168.1.100');
    expect(updatedSurvey.responses[0].userAgent).toBe('Test Browser');
    expect(updatedSurvey.stats.totalResponses).toBe(1);
    expect(updatedSurvey.stats.completionRate).toBe(10);
  });

  it('should prevent multiple submissions when not allowed', async () => {
    const questionId = new mongoose.Types.ObjectId();

    const survey = await Survey.create({
      title: 'Test Survey',
      createdBy: user._id,
      questions: [
        {
          _id: questionId,
          questionText: 'Test question?',
          questionType: 'text',
          required: true
        }
      ],
      settings: {
        allowMultipleSubmissions: false
      }
    });

    const answers = [
      {
        questionId: questionId,
        answer: 'Test answer'
      }
    ];

    // First submission should work
    await survey.addResponse(user._id, answers);

    // Second submission should fail
    await expect(survey.addResponse(user._id, answers))
      .rejects.toThrow('You have already submitted a response to this survey');
  });

  it('should allow multiple submissions when enabled', async () => {
    const questionId = new mongoose.Types.ObjectId();

    const survey = await Survey.create({
      title: 'Test Survey',
      createdBy: user._id,
      questions: [
        {
          _id: questionId,
          questionText: 'Test question?',
          questionType: 'text',
          required: true
        }
      ],
      settings: {
        allowMultipleSubmissions: true
      }
    });

    const answers = [
      {
        questionId: questionId,
        answer: 'Test answer 1'
      }
    ];

    const answers2 = [
      {
        questionId: questionId,
        answer: 'Test answer 2'
      }
    ];

    // Both submissions should work
    await survey.addResponse(user._id, answers);
    await survey.addResponse(user._id, answers2);

    expect(survey.responses).toHaveLength(2);
  });

  it('should find active surveys for user', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

    // Create surveys assigned to different targets
    await Survey.create([
      {
        title: 'All Employees Survey',
        createdBy: user._id,
        status: 'active',
        assignedTo: {
          allEmployees: true
        },
        settings: {
          startDate: new Date(),
          endDate: futureDate
        }
      },
      {
        title: 'Department Survey',
        createdBy: user._id,
        status: 'active',
        assignedTo: {
          departments: [department._id]
        },
        settings: {
          startDate: new Date(),
          endDate: futureDate
        }
      },
      {
        title: 'Role Survey',
        createdBy: user._id,
        status: 'active',
        assignedTo: {
          roles: ['employee']
        },
        settings: {
          startDate: new Date(),
          endDate: futureDate
        }
      },
      {
        title: 'Specific Employee Survey',
        createdBy: user._id,
        status: 'active',
        assignedTo: {
          specificEmployees: [user._id]
        },
        settings: {
          startDate: new Date(),
          endDate: futureDate
        }
      },
      {
        title: 'Manager Survey',
        createdBy: user._id,
        status: 'active',
        assignedTo: {
          roles: ['manager']
        },
        settings: {
          startDate: new Date(),
          endDate: futureDate
        }
      }
    ]);

    const activeSurveys = await Survey.findActiveSurveysForUser(user._id);

    // Should find 4 surveys (all except the manager survey)
    expect(activeSurveys).toHaveLength(4);

    const surveyTitles = activeSurveys.map(s => s.title);
    expect(surveyTitles).toContain('All Employees Survey');
    expect(surveyTitles).toContain('Department Survey');
    expect(surveyTitles).toContain('Role Survey');
    expect(surveyTitles).toContain('Specific Employee Survey');
    expect(surveyTitles).not.toContain('Manager Survey');
  });

  it('should handle anonymous responses', async () => {
    const questionId = new mongoose.Types.ObjectId();

    const survey = await Survey.create({
      title: 'Anonymous Survey',
      createdBy: user._id,
      questions: [
        {
          _id: questionId,
          questionText: 'Test question?',
          questionType: 'text',
          required: true
        }
      ]
    });

    const answers = [
      {
        questionId: questionId,
        answer: 'Anonymous answer'
      }
    ];

    const updatedSurvey = await survey.addResponse(user._id, answers, true);

    expect(updatedSurvey.responses).toHaveLength(1);
    expect(updatedSurvey.responses[0].isAnonymous).toBe(true);
    expect(updatedSurvey.responses[0].respondent).toBeNull();
  });

  it('should handle partial responses', async () => {
    const question1Id = new mongoose.Types.ObjectId();
    const question2Id = new mongoose.Types.ObjectId();

    const survey = await Survey.create({
      title: 'Partial Response Survey',
      createdBy: user._id,
      questions: [
        {
          _id: question1Id,
          questionText: 'Required question?',
          questionType: 'text',
          required: true
        },
        {
          _id: question2Id,
          questionText: 'Optional question?',
          questionType: 'text',
          required: false
        }
      ]
    });

    // Only answer the required question
    const answers = [
      {
        questionId: question1Id,
        answer: 'Required answer'
      }
    ];

    const updatedSurvey = await survey.addResponse(user._id, answers);

    expect(updatedSurvey.responses).toHaveLength(1);
    expect(updatedSurvey.responses[0].completionPercentage).toBe(100); // Only 1 required question answered
    expect(updatedSurvey.responses[0].isComplete).toBe(true);
  });

  it('should handle surveys with no required questions', async () => {
    const questionId = new mongoose.Types.ObjectId();

    const survey = await Survey.create({
      title: 'No Required Questions Survey',
      createdBy: user._id,
      questions: [
        {
          _id: questionId,
          questionText: 'Optional question?',
          questionType: 'text',
          required: false
        }
      ]
    });

    const answers = [
      {
        questionId: questionId,
        answer: 'Optional answer'
      }
    ];

    const updatedSurvey = await survey.addResponse(user._id, answers);

    expect(updatedSurvey.responses).toHaveLength(1);
    expect(updatedSurvey.responses[0].completionPercentage).toBe(100);
    expect(updatedSurvey.responses[0].isComplete).toBe(true);
  });
});
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Survey from '../modules/surveys/models/survey.model.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root .env file
// This works whether the script is run from root or server directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Survey data to upload
const surveyData = {
  title: "Employee Satisfaction Survey - 2025",
  description: "A general survey to measure employee satisfaction regarding workplace, leadership, and company culture.",
  surveyType: "satisfaction",

  questions: [
    {
      questionText: "How satisfied are you with your overall work environment?",
      questionType: "rating",
      ratingScale: { min: 1, max: 5 },
      required: true,
      order: 1
    },
    {
      questionText: "Do you feel your current role aligns with your skills?",
      questionType: "yes-no",
      required: true,
      order: 2
    },
    {
      questionText: "Please provide any additional comments or suggestions.",
      questionType: "textarea",
      required: false,
      order: 3
    }
  ],

  settings: {
    isMandatory: true,
    allowAnonymous: true,
    allowMultipleSubmissions: false,
    startDate: new Date("2025-12-01"),
    endDate: new Date("2026-01-01"),
    emailNotifications: {
      enabled: true,
      sendOnAssignment: true,
      sendReminders: true,
      reminderFrequency: 3
    }
  },

  assignedTo: {
    allEmployees: true,
    locationes: [],
    departments: [],
    roles: [],
    specificEmployees: []
  },

  createdBy: "6915bbf3b7581609eaf10d53"
};

// Upload survey to database
const uploadSurvey = async () => {
  try {
    await connectDB();
    
    // Check if survey already exists
    const existingSurvey = await Survey.findOne({ title: surveyData.title });
    if (existingSurvey) {
      console.log('Survey already exists with title:', surveyData.title);
      console.log('Survey ID:', existingSurvey._id);
      process.exit(0);
    }
    
    // Create new survey
    const survey = new Survey(surveyData);
    await survey.save();
    
    console.log('Survey uploaded successfully!');
    console.log('Survey ID:', survey._id);
    console.log('Survey Title:', survey.title);
    
    process.exit(0);
  } catch (error) {
    console.error('Error uploading survey:', error);
    process.exit(1);
  }
};

// Run the upload
uploadSurvey();
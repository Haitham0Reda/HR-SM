import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

import userRoutes from './routes/user.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import departmentRoutes from './routes/department.routes.js';
import documentRoutes from './routes/document.routes.js';
import documentTemplateRoutes from './routes/documentTemplate.routes.js';
import eventRoutes from './routes/event.routes.js';
import leaveRoutes from './routes/leave.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import payrollRoutes from './routes/payroll.routes.js';
import positionRoutes from './routes/position.routes.js';
import requestRoutes from './routes/request.routes.js';
import surveyRoutes from './routes/survey.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use('/api/users', userRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/document-templates', documentTemplateRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payrolls', payrollRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/surveys', surveyRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
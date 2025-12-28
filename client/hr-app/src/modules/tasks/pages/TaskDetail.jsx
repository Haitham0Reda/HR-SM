import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../store/providers/ReduxAuthProvider';
import { useCompanyRouting } from '../../../hooks/useCompanyRouting';
import TaskReportForm from '../components/TaskReportForm';
import TaskReportList from '../components/TaskReportList';

const TaskDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { user } = useAuth();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showReportForm, setShowReportForm] = useState(false);

    useEffect(() => {
        loadTask();
    }, [id]);

    const loadTask = async () => {
        try {
            const response = await axios.get(`/api/v1/tasks/tasks/${id}`);
            setTask(response.data.data);
        } catch (error) {
            console.error('Failed to load task:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        try {
            await axios.patch(`/api/v1/tasks/tasks/${id}/status`, { status: newStatus });
            loadTask();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update status');
        }
    };

    const canSubmitReport = () => {
        return task?.assignedTo?._id === user?.id &&
            ['in-progress', 'rejected'].includes(task?.status);
    };

    const canUpdateStatus = () => {
        return task?.assignedTo?._id === user?.id;
    };

    if (loading) {
        return <div className="text-center py-8">Loading task...</div>;
    }

    if (!task) {
        return <div className="text-center py-8">Task not found</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <button
                onClick={() => navigate(getCompanyRoute('/tasks'))}
                className="text-blue-600 hover:text-blue-800 mb-4"
            >
                ← Back to Tasks
            </button>

            {/* Task Header */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex justify-between items-start mb-4">
                    <h1 className="text-3xl font-bold text-gray-800">{task.title}</h1>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                    </span>
                </div>

                <p className="text-gray-700 mb-6">{task.description}</p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="font-medium text-gray-600">Priority:</span>
                        <span className={`ml-2 font-semibold ${getPriorityColor(task.priority)}`}>
                            {task.priority.toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <span className="font-medium text-gray-600">Start Date:</span>
                        <span className="ml-2">{new Date(task.startDate).toLocaleDateString()}</span>
                    </div>
                    <div>
                        <span className="font-medium text-gray-600">Due Date:</span>
                        <span className="ml-2">{new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                    <div>
                        <span className="font-medium text-gray-600">Assigned To:</span>
                        <span className="ml-2">
                            {task.assignedTo?.personalInfo?.fullName || 
                             `${task.assignedTo?.personalInfo?.firstName || ''} ${task.assignedTo?.personalInfo?.lastName || ''}`.trim() ||
                             task.assignedTo?.username || 'Unknown User'}
                        </span>
                    </div>
                    <div>
                        <span className="font-medium text-gray-600">Assigned By:</span>
                        <span className="ml-2">
                            {task.assignedBy?.personalInfo?.fullName || 
                             `${task.assignedBy?.personalInfo?.firstName || ''} ${task.assignedBy?.personalInfo?.lastName || ''}`.trim() ||
                             task.assignedBy?.username || 'Unknown User'}
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                {canUpdateStatus() && (
                    <div className="mt-6 flex gap-3">
                        {task.status === 'assigned' && (
                            <button
                                onClick={() => handleStatusUpdate('in-progress')}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                            >
                                Start Task
                            </button>
                        )}
                        {canSubmitReport() && (
                            <button
                                onClick={() => setShowReportForm(true)}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                            >
                                Submit Report
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Report Form */}
            {showReportForm && (
                <TaskReportForm
                    taskId={id}
                    onSuccess={() => {
                        setShowReportForm(false);
                        loadTask();
                    }}
                    onCancel={() => setShowReportForm(false)}
                />
            )}

            {/* Report History */}
            <TaskReportList taskId={id} />
        </div>
    );
};

const getStatusColor = (status) => {
    const colors = {
        'assigned': 'bg-gray-100 text-gray-800',
        'in-progress': 'bg-blue-100 text-blue-800',
        'submitted': 'bg-yellow-100 text-yellow-800',
        'completed': 'bg-green-100 text-green-800',
        'rejected': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};

const getPriorityColor = (priority) => {
    const colors = {
        'low': 'text-green-600',
        'medium': 'text-yellow-600',
        'high': 'text-orange-600',
        'urgent': 'text-red-600'
    };
    return colors[priority] || 'text-gray-600';
};

export default TaskDetail;


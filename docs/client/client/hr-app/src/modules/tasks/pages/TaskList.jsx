import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import { Link } from 'react-router-dom';

const TaskList = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ status: '', priority: '' });
    const { user } = useAuth();

    useEffect(() => {
        loadTasks();
    }, [filter]);

    const loadTasks = async () => {
        try {
            const params = new URLSearchParams();
            if (filter.status) params.append('status', filter.status);
            if (filter.priority) params.append('priority', filter.priority);

            const response = await axios.get(`/api/v1/tasks/tasks?${params}`);
            setTasks(response.data.data);
        } catch (error) {
            console.error('Failed to load tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'assigned': 'bg-gray-100 text-gray-800',
            'in-progress': 'bg-blue-100 text-blue-800',
            'submitted': 'bg-yellow-100 text-yellow-800',
            'reviewed': 'bg-purple-100 text-purple-800',
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

    if (loading) {
        return <div className="text-center py-8">Loading tasks...</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Tasks</h1>
                {['Manager', 'HR', 'Admin'].includes(user?.role) && (
                    <Link
                        to="/tasks/create"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Create Task
                    </Link>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Status
                        </label>
                        <select
                            value={filter.status}
                            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                            <option value="">All Statuses</option>
                            <option value="assigned">Assigned</option>
                            <option value="in-progress">In Progress</option>
                            <option value="submitted">Submitted</option>
                            <option value="completed">Completed</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Priority
                        </label>
                        <select
                            value={filter.priority}
                            onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                            <option value="">All Priorities</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Task List */}
            <div className="space-y-4">
                {tasks.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                        No tasks found
                    </div>
                ) : (
                    tasks.map((task) => (
                        <Link
                            key={task._id}
                            to={`/tasks/${task._id}`}
                            className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-1">
                                        {task.title}
                                    </h3>
                                    <p className="text-gray-600 text-sm line-clamp-2">
                                        {task.description}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2 ml-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                        {task.status}
                                    </span>
                                    <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                        {task.priority.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                <div>
                                    <span className="font-medium">Assigned to:</span>{' '}
                                    {task.assignedTo?.firstName} {task.assignedTo?.lastName}
                                </div>
                                <div>
                                    <span className="font-medium">Assigned by:</span>{' '}
                                    {task.assignedBy?.firstName} {task.assignedBy?.lastName}
                                </div>
                                <div>
                                    <span className="font-medium">Due:</span>{' '}
                                    {new Date(task.dueDate).toLocaleDateString()}
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
};

export default TaskList;

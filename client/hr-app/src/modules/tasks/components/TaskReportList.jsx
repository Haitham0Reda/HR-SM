import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../store/providers/ReduxAuthProvider';

const TaskReportList = ({ taskId }) => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reviewingReport, setReviewingReport] = useState(null);
    const [reviewComments, setReviewComments] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        loadReports();
    }, [taskId]);

    const loadReports = async () => {
        try {
            const response = await axios.get(`/api/v1/tasks/reports/task/${taskId}`);
            setReports(response.data.data);
        } catch (error) {
            console.error('Failed to load reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (reportId, action) => {
        try {
            await axios.patch(`/api/v1/tasks/reports/${reportId}/review`, {
                action,
                comments: reviewComments
            });

            alert(`Report ${action}d successfully!`);
            setReviewingReport(null);
            setReviewComments('');
            loadReports();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to review report');
        }
    };

    if (loading) {
        return <div className="text-center py-4">Loading reports...</div>;
    }

    if (reports.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Report History</h2>
                <p className="text-gray-500">No reports submitted yet</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Report History</h2>

            <div className="space-y-4">
                {reports.map((report) => (
                    <div key={report._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <span className="text-sm text-gray-600">
                                    Version {report.version} - Submitted by{' '}
                                    {report.submittedBy?.firstName} {report.submittedBy?.lastName}
                                </span>
                                <div className="text-xs text-gray-500">
                                    {new Date(report.submittedAt).toLocaleString()}
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                                {report.status}
                            </span>
                        </div>

                        <div className="mb-3">
                            <h4 className="font-medium text-gray-800 mb-2">Report:</h4>
                            <p className="text-gray-700 whitespace-pre-wrap">{report.reportText}</p>
                        </div>

                        {report.timeSpent && (report.timeSpent.hours > 0 || report.timeSpent.minutes > 0) && (
                            <div className="mb-3">
                                <span className="text-sm text-gray-600">
                                    Time Spent: {report.timeSpent.hours}h {report.timeSpent.minutes}m
                                </span>
                            </div>
                        )}

                        {report.files && report.files.length > 0 && (
                            <div className="mb-3">
                                <h4 className="font-medium text-gray-800 mb-2">Attachments:</h4>
                                <div className="space-y-1">
                                    {report.files.map((file) => (
                                        <a
                                            key={file._id}
                                            href={`/api/v1/tasks/reports/${report._id}/files/${file._id}`}
                                            className="text-blue-600 hover:text-blue-800 text-sm block"
                                            download
                                        >
                                            📎 {file.originalName}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {report.reviewComments && (
                            <div className="mt-3 bg-gray-50 p-3 rounded">
                                <h4 className="font-medium text-gray-800 mb-1">Review Comments:</h4>
                                <p className="text-gray-700 text-sm">{report.reviewComments}</p>
                                <div className="text-xs text-gray-500 mt-1">
                                    Reviewed by {report.reviewedBy?.firstName} {report.reviewedBy?.lastName} on{' '}
                                    {new Date(report.reviewedAt).toLocaleString()}
                                </div>
                            </div>
                        )}

                        {/* Review Actions */}
                        {report.status === 'pending' && ['Manager', 'HR', 'Admin'].includes(user?.role) && (
                            <div className="mt-4">
                                {reviewingReport === report._id ? (
                                    <div>
                                        <textarea
                                            value={reviewComments}
                                            onChange={(e) => setReviewComments(e.target.value)}
                                            placeholder="Add review comments..."
                                            rows="3"
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleReview(report._id, 'approve')}
                                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleReview(report._id, 'reject')}
                                                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setReviewingReport(null);
                                                    setReviewComments('');
                                                }}
                                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setReviewingReport(report._id)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                    >
                                        Review Report
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const getStatusColor = (status) => {
    const colors = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'approved': 'bg-green-100 text-green-800',
        'rejected': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};

export default TaskReportList;


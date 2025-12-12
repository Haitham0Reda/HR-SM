import React, { useState } from 'react';
import axios from 'axios';

const TaskReportForm = ({ taskId, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        reportText: '',
        timeSpent: { hours: 0, minutes: 0 }
    });
    const [files, setFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.reportText.length < 50) {
            alert('Report must be at least 50 characters long');
            return;
        }

        setSubmitting(true);

        try {
            const data = new FormData();
            data.append('reportText', formData.reportText);
            data.append('timeSpent', JSON.stringify(formData.timeSpent));

            files.forEach(file => {
                data.append('files', file);
            });

            await axios.post(`/api/v1/tasks/reports/task/${taskId}`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            alert('Report submitted successfully!');
            onSuccess();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to submit report');
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length + files.length > 5) {
            alert('Maximum 5 files allowed');
            return;
        }
        setFiles([...files, ...selectedFiles]);
    };

    const removeFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Submit Task Report</h2>

            <form onSubmit={handleSubmit}>
                {/* Report Text */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Report Description *
                        <span className="text-xs text-gray-500 ml-2">(minimum 50 characters)</span>
                    </label>
                    <textarea
                        value={formData.reportText}
                        onChange={(e) => setFormData({ ...formData, reportText: e.target.value })}
                        rows="6"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Describe the work you completed, challenges faced, and outcomes achieved..."
                        required
                    />
                    <div className="text-xs text-gray-500 mt-1">
                        {formData.reportText.length} / 50 characters
                    </div>
                </div>

                {/* Time Spent */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Time Spent (Optional)
                    </label>
                    <div className="flex gap-4">
                        <div>
                            <input
                                type="number"
                                min="0"
                                value={formData.timeSpent.hours}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    timeSpent: { ...formData.timeSpent, hours: parseInt(e.target.value) || 0 }
                                })}
                                className="w-24 border border-gray-300 rounded-lg px-3 py-2"
                                placeholder="Hours"
                            />
                            <span className="ml-2 text-sm text-gray-600">hours</span>
                        </div>
                        <div>
                            <input
                                type="number"
                                min="0"
                                max="59"
                                value={formData.timeSpent.minutes}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    timeSpent: { ...formData.timeSpent, minutes: parseInt(e.target.value) || 0 }
                                })}
                                className="w-24 border border-gray-300 rounded-lg px-3 py-2"
                                placeholder="Minutes"
                            />
                            <span className="ml-2 text-sm text-gray-600">minutes</span>
                        </div>
                    </div>
                </div>

                {/* File Upload */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Attachments (Optional)
                        <span className="text-xs text-gray-500 ml-2">(max 5 files, 10MB each)</span>
                    </label>
                    <input
                        type="file"
                        onChange={handleFileChange}
                        multiple
                        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />

                    {files.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {files.map((file, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                    <span className="text-sm text-gray-700">{file.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                    >
                        {submitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TaskReportForm;

import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Typography,
    Chip,
    MenuItem
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Assessment } from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import surveyService from '../../services/survey.service';

const SurveysPage = () => {
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedSurvey, setSelectedSurvey] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        questions: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        isActive: true,
        isAnonymous: false
    });
    const { showNotification } = useNotification();

    useEffect(() => {
        fetchSurveys();
    }, []);

    const fetchSurveys = async () => {
        try {
            setLoading(true);
            const data = await surveyService.getAll();
            setSurveys(data);
        } catch (error) {
            showNotification('Failed to fetch surveys', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (survey = null) => {
        if (survey) {
            setSelectedSurvey(survey);
            setFormData({
                title: survey.title || '',
                description: survey.description || '',
                questions: survey.questions?.join('\n') || '',
                startDate: survey.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                endDate: survey.endDate?.split('T')[0] || '',
                isActive: survey.isActive !== false,
                isAnonymous: survey.isAnonymous || false
            });
        } else {
            setSelectedSurvey(null);
            setFormData({
                title: '',
                description: '',
                questions: '',
                startDate: new Date().toISOString().split('T')[0],
                endDate: '',
                isActive: true,
                isAnonymous: false
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedSurvey(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        try {
            const submitData = {
                ...formData,
                questions: formData.questions.split('\n').filter(q => q.trim())
            };

            if (selectedSurvey) {
                await surveyService.update(selectedSurvey._id, submitData);
                showNotification('Survey updated successfully', 'success');
            } else {
                await surveyService.create(submitData);
                showNotification('Survey created successfully', 'success');
            }
            handleCloseDialog();
            fetchSurveys();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Operation failed', 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await surveyService.delete(selectedSurvey._id);
            showNotification('Survey deleted successfully', 'success');
            setOpenConfirm(false);
            setSelectedSurvey(null);
            fetchSurveys();
        } catch (error) {
            showNotification(error.response?.data?.message || 'Delete failed', 'error');
        }
    };

    const columns = [
        { field: 'title', headerName: 'Survey Title', width: 250 },
        { field: 'description', headerName: 'Description', width: 300 },
        {
            field: 'questions',
            headerName: 'Questions',
            width: 100,
            renderCell: (params) => params.row.questions?.length || 0
        },
        {
            field: 'startDate',
            headerName: 'Start Date',
            width: 120,
            renderCell: (params) => new Date(params.row.startDate).toLocaleDateString()
        },
        {
            field: 'endDate',
            headerName: 'End Date',
            width: 120,
            renderCell: (params) => params.row.endDate ? new Date(params.row.endDate).toLocaleDateString() : 'N/A'
        },
        {
            field: 'isAnonymous',
            headerName: 'Anonymous',
            width: 100,
            renderCell: (params) => (
                <Chip
                    label={params.row.isAnonymous ? 'Yes' : 'No'}
                    color={params.row.isAnonymous ? 'primary' : 'default'}
                    size="small"
                />
            )
        },
        {
            field: 'isActive',
            headerName: 'Status',
            width: 100,
            renderCell: (params) => (
                <Chip
                    label={params.row.isActive ? 'Active' : 'Closed'}
                    color={params.row.isActive ? 'success' : 'default'}
                    size="small"
                />
            )
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            renderCell: (params) => (
                <Box>
                    <IconButton
                        size="small"
                        onClick={() => showNotification('Results view coming soon', 'info')}
                        color="primary"
                        title="View Results"
                    >
                        <Assessment fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(params.row)}
                        color="primary"
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => {
                            setSelectedSurvey(params.row);
                            setOpenConfirm(true);
                        }}
                        color="error"
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
            )
        }
    ];

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Surveys</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Create Survey
                </Button>
            </Box>

            <DataTable
                rows={surveys}
                columns={columns}
                getRowId={(row) => row._id}
            />

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {selectedSurvey ? 'Edit Survey' : 'Create Survey'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Survey Title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            multiline
                            rows={2}
                            fullWidth
                        />
                        <TextField
                            label="Questions"
                            name="questions"
                            value={formData.questions}
                            onChange={handleChange}
                            multiline
                            rows={8}
                            required
                            fullWidth
                            helperText="Enter one question per line"
                        />
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                type="date"
                                label="Start Date"
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleChange}
                                required
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                type="date"
                                label="End Date (Optional)"
                                name="endDate"
                                value={formData.endDate}
                                onChange={handleChange}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Box>
                        <TextField
                            select
                            label="Anonymous Responses"
                            name="isAnonymous"
                            value={formData.isAnonymous}
                            onChange={(e) => setFormData(prev => ({ ...prev, isAnonymous: e.target.value === 'true' }))}
                            fullWidth
                        >
                            <MenuItem value="true">Yes (Anonymous)</MenuItem>
                            <MenuItem value="false">No (Track respondents)</MenuItem>
                        </TextField>
                        <TextField
                            select
                            label="Status"
                            name="isActive"
                            value={formData.isActive}
                            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
                            fullWidth
                        >
                            <MenuItem value="true">Active</MenuItem>
                            <MenuItem value="false">Closed</MenuItem>
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedSurvey ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                title="Delete Survey"
                message={`Are you sure you want to delete "${selectedSurvey?.title}"?`}
                onConfirm={handleDelete}
                onCancel={() => {
                    setOpenConfirm(false);
                    setSelectedSurvey(null);
                }}
            />
        </Box>
    );
};

export default SurveysPage;

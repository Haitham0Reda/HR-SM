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
    MenuItem,
    Card,
    CardContent,
    CardActions,
    Divider
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Assessment,
    Visibility as VisibilityIcon,
    CalendarToday as CalendarIcon,
    QuestionAnswer as QuestionIcon,
    CheckCircle,
    AccessTime as AccessTimeIcon,
    Poll as PollIcon
} from '@mui/icons-material';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import surveyService from '../../services/survey.service';

const SurveysPage = () => {
    const { user, isHR, isAdmin } = useAuth();
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedSurvey, setSelectedSurvey] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        surveyType: 'custom',
        questions: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: 'draft',
        isMandatory: false,
        allowAnonymous: false
    });
    const { showNotification } = useNotification();

    // Check if user can manage surveys (HR/Admin)
    const canManage = isHR || isAdmin;

    useEffect(() => {
        fetchSurveys();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchSurveys = async () => {
        try {
            setLoading(true);
            // Use different endpoints based on user role
            const data = canManage 
                ? (await surveyService.getAll()).surveys 
                : (await surveyService.getMySurveys()).surveys;
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
                surveyType: survey.surveyType || 'custom',
                questions: survey.questions?.map(q => q.questionText).join('\n') || '',
                startDate: survey.settings?.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                endDate: survey.settings?.endDate?.split('T')[0] || '',
                status: survey.status || 'draft',
                isMandatory: survey.settings?.isMandatory || false,
                allowAnonymous: survey.settings?.allowAnonymous || false
            });
        } else {
            setSelectedSurvey(null);
            setFormData({
                title: '',
                description: '',
                surveyType: 'custom',
                questions: '',
                startDate: new Date().toISOString().split('T')[0],
                endDate: '',
                status: 'draft',
                isMandatory: false,
                allowAnonymous: false
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
            // Convert questions to proper format
            const questionTexts = formData.questions.split('\n').filter(q => q.trim());
            const questions = questionTexts.map((text, index) => ({
                questionText: text,
                questionType: 'text',
                required: false,
                order: index + 1
            }));

            const submitData = {
                title: formData.title,
                description: formData.description,
                surveyType: formData.surveyType,
                questions: questions,
                settings: {
                    isMandatory: formData.isMandatory,
                    allowAnonymous: formData.allowAnonymous,
                    startDate: formData.startDate,
                    endDate: formData.endDate
                },
                status: formData.status,
                createdBy: user._id
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

    const getSurveyStatusColor = (survey) => {
        if (survey.status === 'draft') return 'default';
        if (survey.status === 'closed' || survey.status === 'archived') return 'default';

        const now = new Date();
        const endDate = survey.settings?.endDate ? new Date(survey.settings.endDate) : null;

        if (endDate && now > endDate) return 'error';
        return 'success';
    };

    const getSurveyStatusLabel = (survey) => {
        if (survey.status === 'draft') return 'Draft';
        if (survey.status === 'closed') return 'Closed';
        if (survey.status === 'archived') return 'Archived';

        const now = new Date();
        const endDate = survey.settings?.endDate ? new Date(survey.settings.endDate) : null;

        if (endDate && now > endDate) return 'Expired';
        return 'Active';
    };

    // Separate surveys into pending and completed based on model structure
    const pendingSurveys = surveys.filter(s =>
        s.status === 'active' &&
        (!s.settings?.endDate || new Date(s.settings.endDate) >= new Date())
    );
    const completedSurveys = surveys.filter(s =>
        s.status === 'closed' ||
        s.status === 'archived' ||
        (s.settings?.endDate && new Date(s.settings.endDate) < new Date())
    );

    // Calculate statistics
    const stats = {
        total: surveys.length,
        pending: pendingSurveys.length,
        completed: completedSurveys.length,
        mandatory: surveys.filter(s => s.settings?.isMandatory).length
    };

    if (loading) return <Loading />;

    return (
        <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {canManage ? 'Surveys' : 'My Surveys'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {canManage ? 'Manage and view all surveys' : 'View and participate in surveys'}
                    </Typography>
                </Box>
                {canManage && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                    >
                        Create Survey
                    </Button>
                )}
            </Box>

            {/* Two Column Layout - Pending and Completed */}
            <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
                {/* Pending Surveys */}
                <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px' }}>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 2,
                        bgcolor: 'warning.main',
                        color: 'white',
                        p: 1.5,
                        borderRadius: 1
                    }}>
                        <Box sx={{
                            bgcolor: 'rgba(255,255,255,0.3)',
                            borderRadius: '50%',
                            width: 24,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700
                        }}>
                            {pendingSurveys.length}
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Pending Surveys
                        </Typography>
                    </Box>

                    <Card sx={{
                        minHeight: 300,
                        bgcolor: 'background.paper',
                        boxShadow: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 3
                    }}>
                        {pendingSurveys.length === 0 ? (
                            <Box sx={{ textAlign: 'center' }}>
                                <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                    All Caught Up!
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    You have no pending surveys at this time.
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ width: '100%' }}>
                                {pendingSurveys.map((survey) => (
                                    <Card key={survey._id} sx={{ mb: 2, boxShadow: 1, '&:hover': { boxShadow: 3 } }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                    {survey.title}
                                                </Typography>
                                                <Chip label="PENDING" size="small" color="warning" sx={{ fontWeight: 600 }} />
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">
                                                📅 Due: {survey.settings?.endDate ? new Date(survey.settings.endDate).toLocaleDateString() : 'No deadline'}
                                            </Typography>
                                        </CardContent>
                                        <CardActions sx={{ justifyContent: 'flex-end' }}>
                                            {!canManage ? (
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    onClick={() => showNotification('Survey form coming soon', 'info')}
                                                >
                                                    Take Survey
                                                </Button>
                                            ) : (
                                                <>
                                                    <IconButton size="small" onClick={() => handleOpenDialog(survey)} color="primary">
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={() => { setSelectedSurvey(survey); setOpenConfirm(true); }} color="error">
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </>
                                            )}
                                        </CardActions>
                                    </Card>
                                ))}
                            </Box>
                        )}
                    </Card>
                </Box>

                {/* Completed Surveys */}
                <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px' }}>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 2,
                        bgcolor: 'success.main',
                        color: 'white',
                        p: 1.5,
                        borderRadius: 1
                    }}>
                        <Box sx={{
                            bgcolor: 'rgba(255,255,255,0.3)',
                            borderRadius: '50%',
                            width: 24,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700
                        }}>
                            {completedSurveys.length}
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Completed Surveys
                        </Typography>
                    </Box>

                    <Card sx={{
                        minHeight: 300,
                        bgcolor: 'background.paper',
                        boxShadow: 2,
                        p: 2
                    }}>
                        {completedSurveys.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 8 }}>
                                <Typography variant="body2" color="text.secondary">
                                    No completed surveys yet
                                </Typography>
                            </Box>
                        ) : (
                            <Box>
                                {completedSurveys.map((survey) => (
                                    <Card key={survey._id} sx={{ mb: 2, boxShadow: 1, '&:hover': { boxShadow: 3 } }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                    {survey.title}
                                                </Typography>
                                                <Chip label="COMPLETED" size="small" color="success" sx={{ fontWeight: 600 }} />
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">
                                                ✅ Completed: {survey.settings?.endDate ? new Date(survey.settings.endDate).toLocaleDateString() : 'N/A'}
                                            </Typography>
                                        </CardContent>
                                        <CardActions sx={{ justifyContent: 'flex-end' }}>
                                            {canManage && (
                                                <>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="success"
                                                        startIcon={<Assessment />}
                                                        onClick={() => showNotification('Results view coming soon', 'info')}
                                                    >
                                                        View Results
                                                    </Button>
                                                    <IconButton size="small" onClick={() => { setSelectedSurvey(survey); setOpenConfirm(true); }} color="error">
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </>
                                            )}
                                            {!canManage && (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="success"
                                                    disabled
                                                >
                                                    ✓ DONE
                                                </Button>
                                            )}
                                        </CardActions>
                                    </Card>
                                ))}
                            </Box>
                        )}
                    </Card>
                </Box>
            </Box>

            {/* Survey Statistics */}
            <Card sx={{ bgcolor: 'background.paper', boxShadow: 2, p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <Assessment sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Survey Statistics
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <Box sx={{
                        flex: '1 1 calc(25% - 18px)',
                        minWidth: '150px',
                        bgcolor: 'info.main',
                        color: 'white',
                        p: 2,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                    }}>
                        <Box sx={{
                            bgcolor: 'rgba(255,255,255,0.3)',
                            width: 48,
                            height: 48,
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Assessment sx={{ fontSize: 32 }} />
                        </Box>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                {stats.total}
                            </Typography>
                            <Typography variant="body2">
                                Total Surveys
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{
                        flex: '1 1 calc(25% - 18px)',
                        minWidth: '150px',
                        bgcolor: 'warning.main',
                        color: 'white',
                        p: 2,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                    }}>
                        <Box sx={{
                            bgcolor: 'rgba(255,255,255,0.3)',
                            width: 48,
                            height: 48,
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <AccessTimeIcon sx={{ fontSize: 32 }} />
                        </Box>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                {stats.pending}
                            </Typography>
                            <Typography variant="body2">
                                Pending
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{
                        flex: '1 1 calc(25% - 18px)',
                        minWidth: '150px',
                        bgcolor: 'success.main',
                        color: 'white',
                        p: 2,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                    }}>
                        <Box sx={{
                            bgcolor: 'rgba(255,255,255,0.3)',
                            width: 48,
                            height: 48,
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <CheckCircle sx={{ fontSize: 32 }} />
                        </Box>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                {stats.completed}
                            </Typography>
                            <Typography variant="body2">
                                Completed
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{
                        flex: '1 1 calc(25% - 18px)',
                        minWidth: '150px',
                        bgcolor: 'error.main',
                        color: 'white',
                        p: 2,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                    }}>
                        <Box sx={{
                            bgcolor: 'rgba(255,255,255,0.3)',
                            width: 48,
                            height: 48,
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <PollIcon sx={{ fontSize: 32 }} />
                        </Box>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                {stats.mandatory}
                            </Typography>
                            <Typography variant="body2">
                                Mandatory
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Card>

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

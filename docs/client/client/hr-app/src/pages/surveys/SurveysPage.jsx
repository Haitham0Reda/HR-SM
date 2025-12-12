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
    FormControlLabel,
    Checkbox
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    QuestionAnswer as QuestionIcon,
    CheckCircle,
    Poll as PollIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import surveyService from '../../services/survey.service';
import SurveyForm from '../../components/surveys/SurveyForm';

const SurveysPage = () => {
    const { user, isHR, isAdmin, setHasPendingSurveys } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedSurvey, setSelectedSurvey] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        surveyType: 'custom',
        questionsList: [
            {
                questionText: '',
                questionType: 'text',
                options: [],
                ratingScale: { min: 1, max: 5 },
                required: false,
                order: 1
            }
        ],
        // Enhanced settings to match the survey model
        settings: {
            isMandatory: false,
            allowAnonymous: false,
            allowMultipleSubmissions: false,
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            emailNotifications: {
                enabled: true,
                sendOnAssignment: true,
                sendReminders: true,
                reminderFrequency: 3
            }
        },
        // Assignment fields to match the survey model
        assignedTo: {
            allEmployees: false,
            locationes: [],
            departments: [],
            roles: [],
            specificEmployees: []
        },
        status: 'draft'
    });
    const { showNotification } = useNotification();

    // Check if user can manage surveys (HR/Admin)
    const canManage = isHR || isAdmin;

    useEffect(() => {
        if (id) {
            // If there's an ID in the URL, we're viewing a specific survey
            // The SurveyForm component will handle loading and displaying it
            return;
        }

        fetchSurveys();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchSurveys = async () => {
        try {
            setLoading(true);
            // Everyone uses getMySurveys to get their personal completion status
            const data = (await surveyService.getMySurveys()).surveys;

            setSurveys(data);
        } catch (error) {
            showNotification('Failed to fetch surveys', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (survey = null) => {
        if (survey) {
            // Check if survey has responses and prevent editing
            if (survey.stats?.totalResponses > 0 || survey.responses?.length > 0) {
                showNotification('Cannot edit a survey that has responses. Close it and create a new one instead.', 'warning');
                return;
            }
            setSelectedSurvey(survey);
            setFormData({
                title: survey.title || '',
                description: survey.description || '',
                surveyType: survey.surveyType || 'custom',
                questionsList: survey.questions || [
                    {
                        questionText: '',
                        questionType: 'text',
                        options: [],
                        ratingScale: { min: 1, max: 5 },
                        required: false,
                        order: 1
                    }
                ],
                settings: {
                    isMandatory: survey.settings?.isMandatory || false,
                    allowAnonymous: survey.settings?.allowAnonymous || false,
                    allowMultipleSubmissions: survey.settings?.allowMultipleSubmissions || false,
                    startDate: survey.settings?.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                    endDate: survey.settings?.endDate?.split('T')[0] || '',
                    emailNotifications: {
                        enabled: survey.settings?.emailNotifications?.enabled !== undefined ? survey.settings.emailNotifications.enabled : true,
                        sendOnAssignment: survey.settings?.emailNotifications?.sendOnAssignment !== undefined ? survey.settings.emailNotifications.sendOnAssignment : true,
                        sendReminders: survey.settings?.emailNotifications?.sendReminders !== undefined ? survey.settings.emailNotifications.sendReminders : true,
                        reminderFrequency: survey.settings?.emailNotifications?.reminderFrequency || 3
                    }
                },
                assignedTo: {
                    allEmployees: survey.assignedTo?.allEmployees || false,
                    locationes: survey.assignedTo?.locationes || [],
                    departments: survey.assignedTo?.departments || [],
                    roles: survey.assignedTo?.roles || [],
                    specificEmployees: survey.assignedTo?.specificEmployees || []
                },
                status: survey.status || 'draft'
            });
        } else {
            setSelectedSurvey(null);
            setFormData({
                title: '',
                description: '',
                surveyType: 'custom',
                questionsList: [
                    {
                        questionText: '',
                        questionType: 'text',
                        options: [],
                        ratingScale: { min: 1, max: 5 },
                        required: false,
                        order: 1
                    }
                ],
                settings: {
                    isMandatory: false,
                    allowAnonymous: false,
                    allowMultipleSubmissions: false,
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: '',
                    emailNotifications: {
                        enabled: true,
                        sendOnAssignment: true,
                        sendReminders: true,
                        reminderFrequency: 3
                    }
                },
                assignedTo: {
                    allEmployees: false,
                    locationes: [],
                    departments: [],
                    roles: [],
                    specificEmployees: []
                },
                status: 'draft'
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedSurvey(null);
    };

    const handleSubmit = async () => {
        try {
            // Use the questionsList directly
            const questions = formData.questionsList.map((question, index) => ({
                ...question,
                order: index + 1
            }));

            const submitData = {
                title: formData.title,
                description: formData.description,
                surveyType: formData.surveyType,
                questions: questions,
                settings: formData.settings,
                assignedTo: formData.assignedTo,
                status: formData.status,
                createdBy: user._id
            };

            if (selectedSurvey) {
                // Double-check before updating
                if (selectedSurvey.stats?.totalResponses > 0 || selectedSurvey.responses?.length > 0) {
                    showNotification('Cannot modify a survey that already has responses. Close the survey and create a new one instead.', 'error');
                    handleCloseDialog();
                    return;
                }
                await surveyService.update(selectedSurvey._id, submitData);
                showNotification('Survey updated successfully', 'success');
            } else {
                await surveyService.create(submitData);
                showNotification('Survey created successfully', 'success');
            }
            handleCloseDialog();
            fetchSurveys();
        } catch (error) {


            // Provide more specific error messages
            let errorMessage = error.response?.data?.error || error.response?.data?.message || 'Operation failed';

            // Check if it's the specific error about updating surveys with responses
            if (errorMessage.includes('Cannot update survey that has responses')) {
                errorMessage = 'Cannot modify a survey that already has responses. Close the survey and create a new one instead.';
            }

            showNotification(errorMessage, 'error');
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

    // Separate surveys into pending and completed based on user's response status
    // Everyone (including admin/HR) sees their personal completion status
    const pendingSurveys = surveys.filter(s => {
        // A survey is pending if the user hasn't completed it
        return !s.isComplete;
    });

    const completedSurveys = surveys.filter(s => {
        // A survey is completed if the user has completed it
        return s.isComplete === true;
    });

    // If we're viewing a specific survey, show the survey form
    if (id) {
        return (
            <Box sx={{ p: 3 }}>
                <Button
                    variant="outlined"
                    onClick={() => navigate('/app/surveys')}
                    sx={{ mb: 2 }}
                >
                    ← Back to Surveys
                </Button>
                <SurveyForm onSurveyComplete={() => {
                    // Reset the pending surveys flag when survey is completed
                    setHasPendingSurveys(false);
                    navigate('/app/surveys');
                }} />
            </Box>
        );
    }

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
                                                    onClick={() => navigate(`/app/surveys/${survey._id}`)}
                                                >
                                                    Take Survey
                                                </Button>
                                            ) : (
                                                <>
                                                    <IconButton size="small" onClick={() => handleOpenDialog(survey)} color="primary">
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => {
                                                            setSelectedSurvey(survey);
                                                            setOpenConfirm(true);
                                                        }}
                                                        color="error"
                                                    >
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
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 3
                    }}>
                        {completedSurveys.length === 0 ? (
                            <Box sx={{ textAlign: 'center' }}>
                                <PollIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                    No Completed Surveys
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Completed surveys will appear here.
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ width: '100%' }}>
                                {completedSurveys.slice(0, 5).map((survey) => (
                                    <Card key={survey._id} sx={{ mb: 2, boxShadow: 1, '&:hover': { boxShadow: 3 } }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                    {survey.title}
                                                </Typography>
                                                <Chip
                                                    label={getSurveyStatusLabel(survey)}
                                                    size="small"
                                                    color={getSurveyStatusColor(survey)}
                                                    sx={{ fontWeight: 600 }}
                                                />
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <QuestionIcon fontSize="small" color="action" />
                                                <Typography variant="caption">
                                                    {survey.questions?.length || 0} questions
                                                </Typography>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">
                                                📅 Completed: {survey.submittedAt ? new Date(survey.submittedAt).toLocaleDateString() : 'N/A'}
                                            </Typography>
                                        </CardContent>
                                        <CardActions sx={{ justifyContent: 'flex-end' }}>
                                            <IconButton size="small" onClick={() => showNotification('Survey results coming soon', 'info')}>
                                                <VisibilityIcon fontSize="small" />
                                            </IconButton>
                                        </CardActions>
                                    </Card>
                                ))}
                            </Box>
                        )}
                    </Card>
                </Box>
            </Box>

            {/* Dialogs */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {selectedSurvey ? 'Edit Survey' : 'Create Survey'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Title"
                        name="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Description"
                        name="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        margin="normal"
                        multiline
                        rows={3}
                    />

                    <TextField
                        select
                        fullWidth
                        label="Survey Type"
                        name="surveyType"
                        value={formData.surveyType}
                        onChange={(e) => setFormData(prev => ({ ...prev, surveyType: e.target.value }))}
                        margin="normal"
                    >
                        <MenuItem value="custom">Custom</MenuItem>
                        <MenuItem value="satisfaction">Satisfaction</MenuItem>
                        <MenuItem value="training">Training</MenuItem>
                        <MenuItem value="performance">Performance</MenuItem>
                        <MenuItem value="policy">Policy</MenuItem>
                        <MenuItem value="360-feedback">360 Feedback</MenuItem>
                        <MenuItem value="exit-interview">Exit Interview</MenuItem>
                    </TextField>

                    {/* Questions Section */}
                    <Box sx={{ mt: 3, mb: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Questions</Typography>
                        {formData.questionsList && formData.questionsList.map((question, index) => (
                            <Card key={index} sx={{ mb: 2, p: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="subtitle1">Question {index + 1}</Typography>
                                    <IconButton
                                        size="small"
                                        onClick={() => {
                                            const newQuestions = [...formData.questionsList];
                                            newQuestions.splice(index, 1);
                                            setFormData(prev => ({ ...prev, questionsList: newQuestions }));
                                        }}
                                        color="error"
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </Box>

                                <TextField
                                    fullWidth
                                    label="Question Text"
                                    value={question.questionText}
                                    onChange={(e) => {
                                        const newQuestions = [...formData.questionsList];
                                        newQuestions[index].questionText = e.target.value;
                                        setFormData(prev => ({ ...prev, questionsList: newQuestions }));
                                    }}
                                    margin="normal"
                                    required
                                />

                                <TextField
                                    select
                                    fullWidth
                                    label="Question Type"
                                    value={question.questionType}
                                    onChange={(e) => {
                                        const newQuestions = [...formData.questionsList];
                                        newQuestions[index].questionType = e.target.value;
                                        // Reset options when changing question type
                                        if (e.target.value !== 'single-choice' && e.target.value !== 'multiple-choice') {
                                            newQuestions[index].options = [];
                                        }
                                        if (e.target.value !== 'rating') {
                                            newQuestions[index].ratingScale = { min: 1, max: 5 };
                                        }
                                        setFormData(prev => ({ ...prev, questionsList: newQuestions }));
                                    }}
                                    margin="normal"
                                >
                                    <MenuItem value="text">Text</MenuItem>
                                    <MenuItem value="textarea">Text Area</MenuItem>
                                    <MenuItem value="single-choice">Single Choice</MenuItem>
                                    <MenuItem value="multiple-choice">Multiple Choice</MenuItem>
                                    <MenuItem value="rating">Rating</MenuItem>
                                    <MenuItem value="yes-no">Yes/No</MenuItem>
                                    <MenuItem value="number">Number</MenuItem>
                                    <MenuItem value="date">Date</MenuItem>
                                </TextField>

                                {/* Options for choice-based questions */}
                                {(question.questionType === 'single-choice' || question.questionType === 'multiple-choice') && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Options</Typography>
                                        {question.options.map((option, optionIndex) => (
                                            <Box key={optionIndex} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                                <TextField
                                                    fullWidth
                                                    value={option}
                                                    onChange={(e) => {
                                                        const newQuestions = [...formData.questionsList];
                                                        newQuestions[index].options[optionIndex] = e.target.value;
                                                        setFormData(prev => ({ ...prev, questionsList: newQuestions }));
                                                    }}
                                                    placeholder={`Option ${optionIndex + 1}`}
                                                />
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        const newQuestions = [...formData.questionsList];
                                                        newQuestions[index].options.splice(optionIndex, 1);
                                                        setFormData(prev => ({ ...prev, questionsList: newQuestions }));
                                                    }}
                                                    color="error"
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        ))}
                                        <Button
                                            variant="outlined"
                                            startIcon={<AddIcon />}
                                            onClick={() => {
                                                const newQuestions = [...formData.questionsList];
                                                newQuestions[index].options.push('');
                                                setFormData(prev => ({ ...prev, questionsList: newQuestions }));
                                            }}
                                            size="small"
                                        >
                                            Add Option
                                        </Button>
                                    </Box>
                                )}

                                {/* Rating scale for rating questions */}
                                {question.questionType === 'rating' && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Rating Scale</Typography>
                                        <Box sx={{ display: 'flex', gap: 2 }}>
                                            <TextField
                                                type="number"
                                                label="Min"
                                                value={question.ratingScale.min}
                                                onChange={(e) => {
                                                    const newQuestions = [...formData.questionsList];
                                                    newQuestions[index].ratingScale.min = parseInt(e.target.value) || 1;
                                                    setFormData(prev => ({ ...prev, questionsList: newQuestions }));
                                                }}
                                                size="small"
                                            />
                                            <TextField
                                                type="number"
                                                label="Max"
                                                value={question.ratingScale.max}
                                                onChange={(e) => {
                                                    const newQuestions = [...formData.questionsList];
                                                    newQuestions[index].ratingScale.max = parseInt(e.target.value) || 5;
                                                    setFormData(prev => ({ ...prev, questionsList: newQuestions }));
                                                }}
                                                size="small"
                                            />
                                        </Box>
                                    </Box>
                                )}

                                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={question.required}
                                                onChange={(e) => {
                                                    const newQuestions = [...formData.questionsList];
                                                    newQuestions[index].required = e.target.checked;
                                                    setFormData(prev => ({ ...prev, questionsList: newQuestions }));
                                                }}
                                            />
                                        }
                                        label="Required"
                                    />
                                </Box>
                            </Card>
                        ))}

                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => {
                                setFormData(prev => ({
                                    ...prev,
                                    questionsList: [
                                        ...prev.questionsList,
                                        {
                                            questionText: '',
                                            questionType: 'text',
                                            options: [],
                                            ratingScale: { min: 1, max: 5 },
                                            required: false,
                                            order: prev.questionsList.length + 1
                                        }
                                    ]
                                }));
                            }}
                        >
                            Add Question
                        </Button>
                    </Box>

                    {/* Settings Section */}
                    <Box sx={{ mt: 3, mb: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Settings</Typography>

                        <TextField
                            select
                            fullWidth
                            label="Status"
                            value={formData.status}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                status: e.target.value
                            }))}
                            margin="normal"
                        >
                            <MenuItem value="draft">Draft</MenuItem>
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="closed">Closed</MenuItem>
                            <MenuItem value="archived">Archived</MenuItem>
                        </TextField>

                        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                            <Button
                                variant={formData.settings.isMandatory ? "contained" : "outlined"}
                                onClick={() => setFormData(prev => ({
                                    ...prev,
                                    settings: { ...prev.settings, isMandatory: !prev.settings.isMandatory }
                                }))}
                            >
                                Mandatory
                            </Button>
                            <Button
                                variant={formData.settings.allowAnonymous ? "contained" : "outlined"}
                                onClick={() => setFormData(prev => ({
                                    ...prev,
                                    settings: { ...prev.settings, allowAnonymous: !prev.settings.allowAnonymous }
                                }))}
                            >
                                Allow Anonymous
                            </Button>
                            <Button
                                variant={formData.settings.allowMultipleSubmissions ? "contained" : "outlined"}
                                onClick={() => setFormData(prev => ({
                                    ...prev,
                                    settings: { ...prev.settings, allowMultipleSubmissions: !prev.settings.allowMultipleSubmissions }
                                }))}
                            >
                                Allow Multiple Submissions
                            </Button>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                            <TextField
                                type="date"
                                label="Start Date"
                                value={formData.settings.startDate}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    settings: { ...prev.settings, startDate: e.target.value }
                                }))}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                            <TextField
                                type="date"
                                label="End Date"
                                value={formData.settings.endDate}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    settings: { ...prev.settings, endDate: e.target.value }
                                }))}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                        </Box>

                        {/* Email Notifications */}
                        <Box sx={{ mt: 3 }}>
                            <Typography variant="subtitle1" sx={{ mb: 1 }}>Email Notifications</Typography>
                            <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={formData.settings.emailNotifications.enabled}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                settings: {
                                                    ...prev.settings,
                                                    emailNotifications: {
                                                        ...prev.settings.emailNotifications,
                                                        enabled: e.target.checked
                                                    }
                                                }
                                            }))}
                                        />
                                    }
                                    label="Enable Notifications"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={formData.settings.emailNotifications.sendOnAssignment}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                settings: {
                                                    ...prev.settings,
                                                    emailNotifications: {
                                                        ...prev.settings.emailNotifications,
                                                        sendOnAssignment: e.target.checked
                                                    }
                                                }
                                            }))}
                                        />
                                    }
                                    label="Send on Assignment"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={formData.settings.emailNotifications.sendReminders}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                settings: {
                                                    ...prev.settings,
                                                    emailNotifications: {
                                                        ...prev.settings.emailNotifications,
                                                        sendReminders: e.target.checked
                                                    }
                                                }
                                            }))}
                                        />
                                    }
                                    label="Send Reminders"
                                />
                            </Box>
                            {formData.settings.emailNotifications.sendReminders && (
                                <TextField
                                    type="number"
                                    label="Reminder Frequency (days)"
                                    value={formData.settings.emailNotifications.reminderFrequency}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        settings: {
                                            ...prev.settings,
                                            emailNotifications: {
                                                ...prev.settings.emailNotifications,
                                                reminderFrequency: parseInt(e.target.value) || 3
                                            }
                                        }
                                    }))}
                                    sx={{ mt: 1, width: 200 }}
                                    InputProps={{ inputProps: { min: 1, max: 30 } }}
                                />
                            )}
                        </Box>
                    </Box>

                    {/* Assignment Section */}
                    <Box sx={{ mt: 3, mb: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Assignment</Typography>

                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={formData.assignedTo.allEmployees}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            assignedTo: { ...prev.assignedTo, allEmployees: e.target.checked }
                                        }))}
                                    />
                                }
                                label="Assign to All Employees"
                            />
                        </Box>

                        {/* Role Assignment */}
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle1" sx={{ mb: 1 }}>Assign to Specific Roles</Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {['admin', 'hr', 'manager', 'employee', 'id-card-admin', 'supervisor', 'head-of-department', 'dean'].map((role) => (
                                    <Button
                                        key={role}
                                        variant={formData.assignedTo.roles.includes(role) ? "contained" : "outlined"}
                                        size="small"
                                        onClick={() => {
                                            setFormData(prev => {
                                                const roles = [...prev.assignedTo.roles];
                                                if (roles.includes(role)) {
                                                    return {
                                                        ...prev,
                                                        assignedTo: {
                                                            ...prev.assignedTo,
                                                            roles: roles.filter(r => r !== role)
                                                        }
                                                    };
                                                } else {
                                                    return {
                                                        ...prev,
                                                        assignedTo: {
                                                            ...prev.assignedTo,
                                                            roles: [...roles, role]
                                                        }
                                                    };
                                                }
                                            });
                                        }}
                                    >
                                        {role}
                                    </Button>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" color="primary">
                        {selectedSurvey ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={openConfirm}
                onClose={() => setOpenConfirm(false)}
                onConfirm={handleDelete}
                title="Delete Survey"
                content="Are you sure you want to delete this survey? This action cannot be undone."
            />
        </Box>
    );
};

export default SurveysPage;
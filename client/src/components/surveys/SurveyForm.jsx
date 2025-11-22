import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    TextField,
    Radio,
    RadioGroup,
    FormControlLabel,
    Checkbox,
    FormControl,
    FormLabel,
    FormGroup,
    Slider,
    Switch,
    Card,
    CardContent,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import surveyService from '../../services/survey.service';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

const SurveyForm = ({ survey: propSurvey, onSurveyComplete }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const { setHasPendingSurveys } = useAuth();
    const [survey, setSurvey] = useState(propSurvey || null);
    const [loading, setLoading] = useState(!propSurvey);
    const [answers, setAnswers] = useState({});
    const [anonymous, setAnonymous] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [openConfirmation, setOpenConfirmation] = useState(false);

    useEffect(() => {
        if (!propSurvey && id) {
            fetchSurvey();
        }
    }, [id, propSurvey]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchSurvey = async () => {
        try {
            setLoading(true);
            const response = await surveyService.getById(id);
            setSurvey(response.survey);
            
            // Initialize answers object
            const initialAnswers = {};
            response.survey.questions.forEach(question => {
                initialAnswers[question._id] = '';
            });
            setAnswers(initialAnswers);
        } catch (error) {
            showNotification('Failed to load survey', 'error');
            navigate('/app/surveys');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (questionId, value, questionType) => {
        setAnswers(prev => {
            // Handle special cases for different question types
            if (questionType === 'multiple-choice') {
                const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
                if (current.includes(value)) {
                    return {
                        ...prev,
                        [questionId]: current.filter(item => item !== value)
                    };
                } else {
                    return {
                        ...prev,
                        [questionId]: [...current, value]
                    };
                }
            }
            
            return {
                ...prev,
                [questionId]: value
            };
        });
    };

    const handleSubmit = async () => {
        // Validate required questions
        const requiredQuestions = survey.questions.filter(q => q.required);
        const unansweredRequired = requiredQuestions.filter(q => {
            const answer = answers[q._id];
            return answer === undefined || answer === null || answer === '';
        });

        if (unansweredRequired.length > 0) {
            showNotification('Please answer all required questions', 'warning');
            return;
        }

        setOpenConfirmation(true);
    };

    const confirmSubmit = async () => {
        try {
            setSubmitting(true);
            setOpenConfirmation(false);
            
            // Format responses for submission
            const responses = Object.keys(answers).map(questionId => ({
                questionId,
                answer: answers[questionId]
            }));
            
            // Debug logging
            console.log('Survey ID:', survey._id);
            console.log('Answers state:', answers);
            console.log('Formatted responses:', responses);
            console.log('Anonymous flag:', anonymous);

            await surveyService.submit(survey._id, responses, anonymous);
            
            showNotification('Survey submitted successfully!', 'success');
            
            // Reset the pending surveys flag
            setHasPendingSurveys(false);
            
            if (onSurveyComplete) {
                onSurveyComplete();
            } else {
                navigate('/app/surveys');
            }
        } catch (error) {
            // Provide more specific error messages
            let errorMessage = error.response?.data?.message || 'Failed to submit survey';
            
            // Check for common error cases
            if (errorMessage.includes('Survey is not active')) {
                errorMessage = 'This survey is no longer active or available.';
            } else if (errorMessage.includes('Survey not found')) {
                errorMessage = 'Survey not found. It may have been deleted.';
            } else if (errorMessage.includes('already submitted')) {
                errorMessage = 'You have already submitted a response to this survey.';
            }
            
            showNotification(errorMessage, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const getProgress = () => {
        if (!survey) return 0;
        
        const totalQuestions = survey.questions.length;
        const answeredQuestions = survey.questions.filter(q => 
            answers[q._id] !== undefined && answers[q._id] !== null && answers[q._id] !== ''
        ).length;
        
        return totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
    };

    const renderQuestion = (question) => {
        switch (question.questionType) {
            case 'text':
                return (
                    <TextField
                        fullWidth
                        label={question.required ? `${question.questionText} *` : question.questionText}
                        value={answers[question._id] || ''}
                        onChange={(e) => handleAnswerChange(question._id, e.target.value, 'text')}
                        required={question.required}
                        variant="outlined"
                        margin="normal"
                    />
                );
            
            case 'textarea':
                return (
                    <TextField
                        fullWidth
                        label={question.required ? `${question.questionText} *` : question.questionText}
                        value={answers[question._id] || ''}
                        onChange={(e) => handleAnswerChange(question._id, e.target.value, 'textarea')}
                        required={question.required}
                        variant="outlined"
                        margin="normal"
                        multiline
                        rows={4}
                    />
                );
            
            case 'single-choice':
                return (
                    <FormControl component="fieldset" margin="normal">
                        <FormLabel component="legend">
                            {question.required ? `${question.questionText} *` : question.questionText}
                        </FormLabel>
                        <RadioGroup
                            value={answers[question._id] || ''}
                            onChange={(e) => handleAnswerChange(question._id, e.target.value, 'single-choice')}
                        >
                            {question.options.map((option, index) => (
                                <FormControlLabel
                                    key={index}
                                    value={option}
                                    control={<Radio />}
                                    label={option}
                                />
                            ))}
                        </RadioGroup>
                    </FormControl>
                );
            
            case 'multiple-choice':
                return (
                    <FormControl component="fieldset" margin="normal">
                        <FormLabel component="legend">
                            {question.required ? `${question.questionText} *` : question.questionText}
                        </FormLabel>
                        <FormGroup>
                            {question.options.map((option, index) => (
                                <FormControlLabel
                                    key={index}
                                    control={
                                        <Checkbox
                                            checked={Array.isArray(answers[question._id]) && answers[question._id].includes(option)}
                                            onChange={() => handleAnswerChange(question._id, option, 'multiple-choice')}
                                        />
                                    }
                                    label={option}
                                />
                            ))}
                        </FormGroup>
                    </FormControl>
                );
            
            case 'rating':
                return (
                    <Box margin="normal">
                        <FormLabel component="legend">
                            {question.required ? `${question.questionText} *` : question.questionText}
                        </FormLabel>
                        <Slider
                            value={answers[question._id] || question.ratingScale.min}
                            onChange={(e, newValue) => handleAnswerChange(question._id, newValue, 'rating')}
                            min={question.ratingScale.min}
                            max={question.ratingScale.max}
                            step={1}
                            marks
                            valueLabelDisplay="auto"
                        />
                        <Box display="flex" justifyContent="space-between">
                            <Typography variant="caption">{question.ratingScale.min}</Typography>
                            <Typography variant="caption">{question.ratingScale.max}</Typography>
                        </Box>
                    </Box>
                );
            
            case 'yes-no':
                return (
                    <FormControl component="fieldset" margin="normal">
                        <FormLabel component="legend">
                            {question.required ? `${question.questionText} *` : question.questionText}
                        </FormLabel>
                        <RadioGroup
                            value={answers[question._id] || ''}
                            onChange={(e) => handleAnswerChange(question._id, e.target.value === 'true', 'yes-no')}
                        >
                            <FormControlLabel value="true" control={<Radio />} label="Yes" />
                            <FormControlLabel value="false" control={<Radio />} label="No" />
                        </RadioGroup>
                    </FormControl>
                );
            
            case 'number':
                return (
                    <TextField
                        fullWidth
                        label={question.required ? `${question.questionText} *` : question.questionText}
                        type="number"
                        value={answers[question._id] || ''}
                        onChange={(e) => handleAnswerChange(question._id, e.target.value, 'number')}
                        required={question.required}
                        variant="outlined"
                        margin="normal"
                    />
                );
            
            case 'date':
                return (
                    <TextField
                        fullWidth
                        label={question.required ? `${question.questionText} *` : question.questionText}
                        type="date"
                        value={answers[question._id] || ''}
                        onChange={(e) => handleAnswerChange(question._id, e.target.value, 'date')}
                        required={question.required}
                        variant="outlined"
                        margin="normal"
                        InputLabelProps={{
                            shrink: true,
                        }}
                    />
                );
            
            default:
                return (
                    <TextField
                        fullWidth
                        label={question.required ? `${question.questionText} *` : question.questionText}
                        value={answers[question._id] || ''}
                        onChange={(e) => handleAnswerChange(question._id, e.target.value, 'text')}
                        required={question.required}
                        variant="outlined"
                        margin="normal"
                    />
                );
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <Typography>Loading survey...</Typography>
            </Box>
        );
    }

    if (!survey) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <Typography>Survey not found</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h4" gutterBottom>
                        {survey.title}
                    </Typography>
                    {survey.description && (
                        <Typography variant="body1" color="text.secondary" paragraph>
                            {survey.description}
                        </Typography>
                    )}
                    
                    <LinearProgress 
                        variant="determinate" 
                        value={getProgress()} 
                        sx={{ mb: 2 }} 
                    />
                    <Typography variant="body2" color="text.secondary" align="right">
                        {getProgress()}% Complete
                    </Typography>
                </CardContent>
            </Card>

            <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                {survey.questions.map((question) => (
                    <Card key={question._id} sx={{ mb: 3 }}>
                        <CardContent>
                            {renderQuestion(question)}
                        </CardContent>
                    </Card>
                ))}

                {survey.settings.allowAnonymous && (
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={anonymous}
                                        onChange={(e) => setAnonymous(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label="Submit anonymously"
                            />
                            <Typography variant="body2" color="text.secondary">
                                Your response will not be linked to your account
                            </Typography>
                        </CardContent>
                    </Card>
                )}

                <Box display="flex" justifyContent="flex-end" gap={2}>
                    <Button
                        variant="outlined"
                        onClick={() => navigate('/app/surveys')}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={submitting}
                    >
                        {submitting ? 'Submitting...' : 'Submit Survey'}
                    </Button>
                </Box>
            </Box>

            <Dialog open={openConfirmation} onClose={() => setOpenConfirmation(false)}>
                <DialogTitle>Confirm Submission</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to submit this survey? You won't be able to make changes after submission.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenConfirmation(false)}>Cancel</Button>
                    <Button 
                        onClick={confirmSubmit} 
                        variant="contained" 
                        color="primary"
                        disabled={submitting}
                    >
                        {submitting ? 'Submitting...' : 'Confirm Submit'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SurveyForm;
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useCompanyRouting } from '../hooks/useCompanyRouting';
import surveyService from '../services/survey.service';

const SurveyRedirect = () => {
    const { getCompanyRoute } = useCompanyRouting();
    const navigate = useNavigate();
    const { user, hasPendingSurveys, setHasPendingSurveys } = useAuth();
    const { showNotification } = useNotification();

    useEffect(() => {
        const checkAndRedirectToSurvey = async () => {
            if (hasPendingSurveys && user) {
                try {
                    // Get the latest survey data
                    const surveys = await surveyService.getMySurveys();
                    const pendingMandatorySurveys = surveys.surveys?.filter(survey => 
                        survey.isMandatory && !survey.isComplete
                    );

                    if (pendingMandatorySurveys && pendingMandatorySurveys.length > 0) {
                        // Redirect to the first pending mandatory survey
                        const firstSurvey = pendingMandatorySurveys[0];

                        navigate(getCompanyRoute(`/surveys/${firstSurvey._id}`));
                    } else {
                        // No more pending surveys, update the flag
                        setHasPendingSurveys(false);
                    }
                } catch (error) {

                    showNotification('Error checking for pending surveys', 'error');
                    setHasPendingSurveys(false);
                }
            }
        };

        checkAndRedirectToSurvey();
    }, [hasPendingSurveys, user, navigate, setHasPendingSurveys, showNotification]);

    return null;
};

export default SurveyRedirect;
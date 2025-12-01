import { useEffect, useState } from 'react';
import { useSeasonDetector } from '../../hooks/useSeasonDetector';
import { useMobileCheck } from '../../hooks/useMobileCheck';
import SnowEffect from './effects/SnowEffect';
import FireworksEffect from './effects/FireworksEffect';
import MoonEffect from './effects/MoonEffect';
import LanternEffect from './effects/LanternEffect';
import './SeasonalEffects.css';

/**
 * SeasonalEffectsManager - Main component for managing seasonal decorations
 * @param {Object} settings - Configuration object for seasonal effects
 */
const SeasonalEffectsManager = ({ settings }) => {
    const [currentSeason, setCurrentSeason] = useState(null);
    const [shouldRender, setShouldRender] = useState(false);
    const autoDetectedSeason = useSeasonDetector();
    const isMobile = useMobileCheck();

    useEffect(() => {
        // Set CSS variable for opacity
        document.documentElement.style.setProperty(
            '--decorations-opacity',
            settings.opacity || 0.8
        );
    }, [settings.opacity]);

    useEffect(() => {
        // Determine if effects should render
        if (!settings.enabled) {
            setShouldRender(false);
            setCurrentSeason(null);
            return;
        }

        // Check mobile restrictions
        if (isMobile && !settings.enableMobile) {
            setShouldRender(false);
            setCurrentSeason(null);
            return;
        }

        // Determine current season
        const season = settings.autoDetect
            ? autoDetectedSeason
            : settings.manualSeason;

        setCurrentSeason(season);
        setShouldRender(!!season && season !== 'none');
    }, [
        settings.enabled,
        settings.autoDetect,
        settings.manualSeason,
        settings.enableMobile,
        autoDetectedSeason,
        isMobile
    ]);

    if (!shouldRender || !currentSeason) {
        return null;
    }

    return (
        <>
            {/* Christmas Effects */}
            {currentSeason === 'christmas' &&
                settings.christmas?.enabled &&
                settings.christmas?.snowEffect && (
                    <SnowEffect key="snow-effect" />
                )}

            {/* New Year Effects */}
            {currentSeason === 'newyear' &&
                settings.newyear?.enabled &&
                settings.newyear?.fireworksEffect && (
                    <FireworksEffect key="fireworks-effect" />
                )}

            {/* Eid al-Fitr Effects */}
            {currentSeason === 'eid-fitr' &&
                settings.eidFitr?.enabled &&
                settings.eidFitr?.crescentEffect && (
                    <MoonEffect key="moon-effect" />
                )}

            {/* Eid al-Adha Effects */}
            {currentSeason === 'eid-adha' &&
                settings.eidAdha?.enabled &&
                settings.eidAdha?.lanternEffect && (
                    <LanternEffect key="lantern-effect" />
                )}
        </>
    );
};

export default SeasonalEffectsManager;

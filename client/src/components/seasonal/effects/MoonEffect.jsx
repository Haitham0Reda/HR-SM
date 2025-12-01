import { useEffect, useRef } from 'react';

/**
 * MoonEffect - Creates floating crescent moon animation
 */
const MoonEffect = () => {
    const containerRef = useRef(null);
    const moonRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const createMoon = () => {
            const moon = document.createElement('div');
            moon.className = 'crescent-moon';
            moon.innerHTML = '🌙';

            // Random starting position (percentage-based)
            const startX = Math.random() * 80 + 10; // 10-90%
            const startY = Math.random() * 30 + 5; // 5-35% from top

            // Use cssText with !important
            moon.style.cssText = `
                position: absolute !important;
                left: ${startX}% !important;
                top: ${startY}% !important;
                font-size: 4em !important;
                opacity: var(--decorations-opacity, 0.8) !important;
                animation: moonGlow 3s ease-in-out infinite !important;
                filter: drop-shadow(0 0 20px rgba(255, 223, 0, 0.8)) !important;
                user-select: none !important;
                pointer-events: none !important;
                transition: all 0.1s ease-out !important;
            `;

            container.appendChild(moon);
            moonRef.current = moon;
        };

        createMoon();

        // Animate moon position (percentage-based)
        let posX = parseFloat(moonRef.current.style.left);
        let posY = parseFloat(moonRef.current.style.top);
        let velocityX = 0.05; // Slower movement in percentage
        let velocityY = 0.03;
        let time = 0;

        const animateMoon = () => {
            if (!moonRef.current) return;

            time += 0.01;

            // Smooth floating motion using sine waves
            posX += velocityX;
            posY += Math.sin(time) * 0.05;

            // Bounce off edges (percentage-based)
            if (posX > 90 || posX < 10) {
                velocityX *= -1;
            }
            if (posY > 35 || posY < 5) {
                velocityY *= -1;
            }

            moonRef.current.style.setProperty('left', `${posX}%`, 'important');
            moonRef.current.style.setProperty('top', `${posY}%`, 'important');

            requestAnimationFrame(animateMoon);
        };

        const animationId = requestAnimationFrame(animateMoon);

        return () => {
            cancelAnimationFrame(animationId);
            if (moonRef.current && moonRef.current.parentNode) {
                moonRef.current.remove();
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="moon-effect-container"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 9999,
                overflow: 'hidden'
            }}
        />
    );
};

export default MoonEffect;

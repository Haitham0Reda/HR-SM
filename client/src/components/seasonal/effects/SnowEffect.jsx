import { useEffect, useRef } from 'react';

/**
 * SnowEffect - Creates falling snowflakes animation
 */
const SnowEffect = () => {
    const containerRef = useRef(null);
    const snowflakesRef = useRef([]);
    const animationFrameRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const createSnowflake = () => {
            const snowflake = document.createElement('div');
            snowflake.className = 'snowflake';
            snowflake.innerHTML = '❄';

            // Random properties
            const leftPosition = Math.random() * 100; // 0-100%
            const size = Math.random() * 1.5 + 0.5; // 0.5 - 2em
            const duration = Math.random() * 3 + 5; // 5-8 seconds
            const delay = Math.random() * 2; // 0-2 seconds
            const drift = (Math.random() - 0.5) * 100; // -50 to 50px horizontal drift

            // Use cssText with !important to ensure styles apply
            snowflake.style.cssText = `
                position: absolute !important;
                top: -50px !important;
                left: ${leftPosition}% !important;
                color: #fff !important;
                font-size: ${size}em !important;
                opacity: var(--decorations-opacity, 0.8) !important;
                animation: snowfall ${duration}s linear forwards !important;
                animation-delay: ${delay}s !important;
                text-shadow: 0 0 5px rgba(255, 255, 255, 0.8) !important;
                user-select: none !important;
                pointer-events: none !important;
                --drift: ${drift}px;
            `;

            container.appendChild(snowflake);
            snowflakesRef.current.push(snowflake);

            // Remove after animation
            setTimeout(() => {
                if (snowflake.parentNode) {
                    snowflake.remove();
                }
                snowflakesRef.current = snowflakesRef.current.filter(s => s !== snowflake);
            }, (duration + delay) * 1000);
        };

        // Create initial snowflakes
        const initialCount = Math.floor(window.innerWidth / 50); // Responsive count
        for (let i = 0; i < initialCount; i++) {
            setTimeout(() => createSnowflake(), i * 200);
        }

        // Continuously create new snowflakes
        const interval = setInterval(() => {
            if (snowflakesRef.current.length < 50) { // Max 50 snowflakes
                createSnowflake();
            }
        }, 500);

        return () => {
            clearInterval(interval);
            const currentAnimationFrame = animationFrameRef.current;
            if (currentAnimationFrame) {
                cancelAnimationFrame(currentAnimationFrame);
            }
            // Clean up all snowflakes
            snowflakesRef.current.forEach(snowflake => {
                if (snowflake.parentNode) {
                    snowflake.remove();
                }
            });
            snowflakesRef.current = [];
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="snow-effect-container"
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

export default SnowEffect;

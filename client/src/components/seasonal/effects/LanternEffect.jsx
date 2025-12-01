import { useEffect, useRef } from 'react';

/**
 * LanternEffect - Creates rising lanterns animation
 */
const LanternEffect = () => {
    const containerRef = useRef(null);
    const lanternsRef = useRef([]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const createLantern = () => {
            const lantern = document.createElement('div');
            lantern.className = 'lantern';
            lantern.innerHTML = '🏮';

            // Random properties
            const leftPosition = Math.random() * 100; // 0-100%
            const size = Math.random() * 1 + 1; // 1 - 2em
            const duration = Math.random() * 5 + 8; // 8-13 seconds
            const delay = Math.random() * 3; // 0-3 seconds
            const sway = (Math.random() - 0.5) * 50; // -25 to 25px horizontal sway

            // Use cssText with !important to ensure styles apply
            lantern.style.cssText = `
                position: absolute !important;
                bottom: -100px !important;
                left: ${leftPosition}% !important;
                font-size: ${size}em !important;
                opacity: var(--decorations-opacity, 0.8) !important;
                animation: lanternRise ${duration}s linear forwards !important;
                animation-delay: ${delay}s !important;
                filter: drop-shadow(0 0 10px rgba(255, 100, 0, 0.6)) !important;
                user-select: none !important;
                pointer-events: none !important;
                --sway: ${sway}px;
            `;

            container.appendChild(lantern);
            lanternsRef.current.push(lantern);

            // Remove after animation
            setTimeout(() => {
                if (lantern.parentNode) {
                    lantern.remove();
                }
                lanternsRef.current = lanternsRef.current.filter(l => l !== lantern);
            }, (duration + delay) * 1000);
        };

        // Create initial lanterns
        const initialCount = Math.floor(window.innerWidth / 100); // Responsive count
        for (let i = 0; i < initialCount; i++) {
            setTimeout(() => createLantern(), i * 500);
        }

        // Continuously create new lanterns
        const interval = setInterval(() => {
            if (lanternsRef.current.length < 20) { // Max 20 lanterns
                createLantern();
            }
        }, 2000);

        return () => {
            clearInterval(interval);
            // Clean up all lanterns
            lanternsRef.current.forEach(lantern => {
                if (lantern.parentNode) {
                    lantern.remove();
                }
            });
            lanternsRef.current = [];
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="lantern-effect-container"
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

export default LanternEffect;

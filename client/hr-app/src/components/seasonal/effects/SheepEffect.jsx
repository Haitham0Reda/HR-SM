import { useEffect, useRef } from 'react';

/**
 * SheepEffect - Creates rising sheep animation
 */
const SheepEffect = () => {
    const containerRef = useRef(null);
    const sheepRef = useRef([]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const createSheep = () => {
            const sheep = document.createElement('div');
            sheep.className = 'sheep';
            sheep.innerHTML = '🐑';

            // Random properties
            const leftPosition = Math.random() * 100; // 0–100%
            const size = Math.random() * 1 + 1; // 1–2em
            const duration = Math.random() * 5 + 8; // 8–13s
            const delay = Math.random() * 3; // 0–3s
            const sway = (Math.random() - 0.5) * 50; // -25 to 25px

            sheep.style.cssText = `
                position: absolute !important;
                bottom: -100px !important;
                left: ${leftPosition}% !important;
                font-size: ${size}em !important;
                opacity: var(--decorations-opacity, 0.9) !important;
                animation: sheepRise ${duration}s linear forwards !important;
                animation-delay: ${delay}s !important;
                filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.6)) !important;
                user-select: none !important;
                pointer-events: none !important;
                --sway: ${sway}px;
            `;

            container.appendChild(sheep);
            sheepRef.current.push(sheep);

            // Remove after animation ends
            setTimeout(() => {
                if (sheep.parentNode) sheep.remove();
                sheepRef.current = sheepRef.current.filter(s => s !== sheep);
            }, (duration + delay) * 1000);
        };

        // Create initial sheep
        const initialCount = Math.floor(window.innerWidth / 100);
        for (let i = 0; i < initialCount; i++) {
            setTimeout(() => createSheep(), i * 500);
        }

        // Continuous creation
        const interval = setInterval(() => {
            if (sheepRef.current.length < 20) {
                createSheep();
            }
        }, 2000);

        return () => {
            clearInterval(interval);
            sheepRef.current.forEach(sheep => sheep.remove());
            sheepRef.current = [];
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="sheep-effect-container"
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

export default SheepEffect;

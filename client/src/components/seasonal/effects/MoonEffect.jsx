import { useEffect, useRef } from 'react';

/**
 * MoonEffect - Creates floating crescent moon animation
 */
const MoonEffect = () => {
    const containerRef = useRef(null);
    const moonsRef = useRef([]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const createMoon = (index) => {
            const moon = document.createElement('div');
            moon.className = 'crescent-moon';
            moon.innerHTML = '🌙';

            // Random starting position (percentage-based)
            const startX = Math.random() * 80 + 10; // 10-90%
            const startY = Math.random() * 40 + 5; // 5-45% from top

            // Varied sizes for depth
            const sizes = ['2.5em', '3em', '3.5em', '4em', '4.5em', '5em'];
            const fontSize = sizes[Math.floor(Math.random() * sizes.length)];
            
            // Varied opacity for depth
            const opacity = 0.6 + Math.random() * 0.3;

            // Use cssText with !important
            moon.style.cssText = `
                position: absolute !important;
                left: ${startX}% !important;
                top: ${startY}% !important;
                font-size: ${fontSize} !important;
                opacity: ${opacity} !important;
                animation: moonGlow ${2 + Math.random() * 2}s ease-in-out infinite !important;
                filter: drop-shadow(0 0 20px rgba(255, 223, 0, 0.8)) !important;
                user-select: none !important;
                pointer-events: none !important;
                transition: all 0.1s ease-out !important;
            `;

            container.appendChild(moon);
            
            return {
                element: moon,
                posX: startX,
                posY: startY,
                velocityX: (Math.random() - 0.5) * 0.08,
                velocityY: (Math.random() - 0.5) * 0.06,
                time: Math.random() * Math.PI * 2
            };
        };

        // Create multiple moons (5-7 moons)
        const moonCount = 5 + Math.floor(Math.random() * 3);
        for (let i = 0; i < moonCount; i++) {
            setTimeout(() => {
                moonsRef.current.push(createMoon(i));
            }, i * 200);
        }

        const animateMoons = () => {
            moonsRef.current.forEach((moon) => {
                if (!moon.element) return;

                moon.time += 0.01;

                // Smooth floating motion using sine waves
                moon.posX += moon.velocityX;
                moon.posY += Math.sin(moon.time) * 0.05;

                // Bounce off edges (percentage-based)
                if (moon.posX > 90 || moon.posX < 10) {
                    moon.velocityX *= -1;
                }
                if (moon.posY > 45 || moon.posY < 5) {
                    moon.velocityY *= -1;
                }

                moon.element.style.setProperty('left', `${moon.posX}%`, 'important');
                moon.element.style.setProperty('top', `${moon.posY}%`, 'important');
            });

            requestAnimationFrame(animateMoons);
        };

        const animationId = requestAnimationFrame(animateMoons);

        return () => {
            cancelAnimationFrame(animationId);
            moonsRef.current.forEach((moon) => {
                if (moon.element && moon.element.parentNode) {
                    moon.element.remove();
                }
            });
            moonsRef.current = [];
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

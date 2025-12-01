import { useEffect, useRef } from 'react';

const TestCanvas = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Draw big red square
        ctx.fillStyle = 'red';
        ctx.fillRect(100, 100, 300, 300);

        console.log('TEST CANVAS: Drew red square at 100,100');
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 999999,
                backgroundColor: 'rgba(0,0,0,0.1)',
                pointerEvents: 'none'
            }}
        />
    );
};

export default TestCanvas;

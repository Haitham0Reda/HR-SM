import { useEffect, useRef } from 'react';

/**
 * FireworksEffect - Creates fireworks animation using canvas
 */
const FireworksEffect = () => {
    const canvasRef = useRef(null);
    const animationFrameRef = useRef(null);
    const particlesRef = useRef([]);
    const fireworksRef = useRef([]);

    useEffect(() => {
        console.log('🎆 FireworksEffect: Mounting...');
        const canvas = canvasRef.current;
        if (!canvas) {
            console.log('❌ FireworksEffect: Canvas not found!');
            return;
        }
        console.log('✅ FireworksEffect: Canvas found', { width: canvas.width, height: canvas.height });

        const ctx = canvas.getContext('2d');

        // Set canvas size to full viewport
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            console.log('🎆 Canvas resized:', {
                width: canvas.width,
                height: canvas.height,
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight
            });
        };

        // Force initial size
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Firework class
        class Firework {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = canvas.height;
                this.targetY = Math.random() * canvas.height * 0.5;
                this.speed = 3 + Math.random() * 2;
                this.exploded = false;
                this.hue = Math.random() * 360;
            }

            update() {
                if (!this.exploded) {
                    this.y -= this.speed;
                    if (this.y <= this.targetY) {
                        this.explode();
                    }
                }
            }

            draw() {
                if (!this.exploded) {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
                    ctx.fillStyle = `hsl(${this.hue}, 100%, 70%)`;
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = `hsl(${this.hue}, 100%, 70%)`;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }

            explode() {
                this.exploded = true;
                const particleCount = 100 + Math.random() * 100;
                for (let i = 0; i < particleCount; i++) {
                    particlesRef.current.push(new Particle(this.x, this.y, this.hue));
                }
                console.log('💥 Firework exploded at', { x: this.x, y: this.y, particles: particleCount });
            }
        }

        // Particle class
        class Particle {
            constructor(x, y, hue) {
                this.x = x;
                this.y = y;
                this.hue = hue + Math.random() * 30 - 15;
                this.angle = Math.random() * Math.PI * 2;
                this.speed = Math.random() * 5 + 2;
                this.friction = 0.95;
                this.gravity = 0.3;
                this.opacity = 1;
                this.decay = Math.random() * 0.015 + 0.015;
                this.vx = Math.cos(this.angle) * this.speed;
                this.vy = Math.sin(this.angle) * this.speed;
            }

            update() {
                // Don't move - just stay in place for testing
                // this.vx *= this.friction;
                // this.vy *= this.friction;
                // this.vy += this.gravity;
                // this.x += this.vx;
                // this.y += this.vy;
                this.opacity -= 0.001; // Very slow fade
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                // Draw as rectangle for better visibility
                ctx.fillStyle = `hsl(${this.hue}, 100%, 70%)`;
                ctx.fillRect(this.x - 8, this.y - 8, 16, 16);
                ctx.restore();
            }

            isDead() {
                return this.opacity <= 0;
            }
        }

        // Create test explosion immediately
        console.log('🎆 Creating test explosion at center...');
        const testX = canvas.width / 2;
        const testY = canvas.height / 2;
        for (let i = 0; i < 200; i++) {
            const particle = {
                x: testX,
                y: testY,
                hue: Math.random() * 360,
                angle: Math.random() * Math.PI * 2,
                speed: Math.random() * 5 + 2,
                friction: 0.95,
                gravity: 0.3,
                opacity: 1,
                decay: 0.02,
                vx: 0,
                vy: 0,
                update() {
                    // Don't move - just stay in place for testing
                    // this.vx = Math.cos(this.angle) * this.speed;
                    // this.vy = Math.sin(this.angle) * this.speed;
                    // this.vx *= this.friction;
                    // this.vy *= this.friction;
                    // this.vy += this.gravity;
                    // this.x += this.vx;
                    // this.y += this.vy;
                    this.opacity -= 0.001; // Very slow fade
                },
                draw() {
                    ctx.save();
                    ctx.globalAlpha = this.opacity;
                    // Draw as rectangle for better visibility
                    ctx.fillStyle = `hsl(${this.hue}, 100%, 80%)`;
                    ctx.fillRect(this.x - 10, this.y - 10, 20, 20);
                    ctx.restore();
                },
                isDead() {
                    return this.opacity <= 0;
                }
            };
            particlesRef.current.push(particle);
        }
        console.log('💥 Test explosion created with 200 particles');

        // Create initial fireworks
        console.log('🎆 FireworksEffect: Creating initial fireworks...');
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                fireworksRef.current.push(new Firework());
                console.log('🎆 Created firework', i + 1);
            }, i * 300);
        }

        // Animation loop
        const animate = () => {
            // Clear canvas completely
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update and draw fireworks
            fireworksRef.current = fireworksRef.current.filter(firework => {
                firework.update();
                firework.draw();
                return !firework.exploded;
            });

            // Update and draw particles
            particlesRef.current = particlesRef.current.filter(particle => {
                particle.update();
                particle.draw();
                return !particle.isDead();
            });

            // Create new fireworks frequently
            if (Math.random() < 0.08 && fireworksRef.current.length < 5) {
                fireworksRef.current.push(new Firework());
            }

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        console.log('🎆 FireworksEffect: Starting animation loop...');
        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            particlesRef.current = [];
            fireworksRef.current = [];
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fireworks-canvas"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 99999,
                display: 'block',
                visibility: 'visible',
                backgroundColor: 'rgba(0, 0, 0, 0.3)' // Semi-transparent background to see canvas
            }}
        />
    );
};

export default FireworksEffect;

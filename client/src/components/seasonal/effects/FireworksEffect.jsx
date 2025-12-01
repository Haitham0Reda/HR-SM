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
                // Launch from bottom, spread across width
                this.x = canvas.width * 0.15 + Math.random() * canvas.width * 0.7;
                this.y = canvas.height;
                // Explode in top 20-50% of screen
                this.targetY = canvas.height * (0.2 + Math.random() * 0.3);
                this.speed = 5 + Math.random() * 4;
                this.exploded = false;
                // Vibrant colors for fireworks
                const colors = [0, 30, 60, 120, 180, 240, 280, 320];
                this.hue = colors[Math.floor(Math.random() * colors.length)];
                this.trail = [];
            }

            update() {
                if (!this.exploded) {
                    // Add trail effect
                    this.trail.push({ x: this.x, y: this.y });
                    if (this.trail.length > 10) this.trail.shift();
                    
                    this.y -= this.speed;
                    if (this.y <= this.targetY) {
                        this.explode();
                    }
                }
            }

            draw() {
                if (!this.exploded) {
                    // Draw trail with fade
                    this.trail.forEach((pos, index) => {
                        const alpha = index / this.trail.length;
                        ctx.save();
                        ctx.globalAlpha = alpha * 0.7;
                        ctx.beginPath();
                        ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
                        ctx.fillStyle = `hsl(45, 100%, 80%)`;
                        ctx.shadowBlur = 5;
                        ctx.shadowColor = `hsl(45, 100%, 80%)`;
                        ctx.fill();
                        ctx.restore();
                    });
                    
                    // Draw main rocket with bright glow
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
                    ctx.fillStyle = 'white';
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = `hsl(45, 100%, 70%)`;
                    ctx.fill();
                    ctx.restore();
                }
            }

            explode() {
                this.exploded = true;
                
                // Random explosion type
                const explosionType = Math.random();
                
                if (explosionType < 0.3) {
                    // Ring explosion
                    const particleCount = 60;
                    for (let i = 0; i < particleCount; i++) {
                        particlesRef.current.push(new Particle(this.x, this.y, this.hue, true));
                    }
                } else if (explosionType < 0.6) {
                    // Burst explosion with multiple rings
                    for (let ring = 0; ring < 3; ring++) {
                        setTimeout(() => {
                            const particleCount = 40;
                            for (let i = 0; i < particleCount; i++) {
                                particlesRef.current.push(new Particle(this.x, this.y, this.hue + ring * 30));
                            }
                        }, ring * 50);
                    }
                } else {
                    // Classic burst
                    const particleCount = 100 + Math.random() * 50;
                    for (let i = 0; i < particleCount; i++) {
                        particlesRef.current.push(new Particle(this.x, this.y, this.hue));
                    }
                    
                    // Add some sparkles
                    for (let i = 0; i < 20; i++) {
                        setTimeout(() => {
                            particlesRef.current.push(new Particle(
                                this.x + (Math.random() - 0.5) * 50,
                                this.y + (Math.random() - 0.5) * 50,
                                this.hue
                            ));
                        }, Math.random() * 200);
                    }
                }
            }
        }

        // Particle class
        class Particle {
            constructor(x, y, hue, isRing = false) {
                this.x = x;
                this.y = y;
                this.hue = hue + Math.random() * 30 - 15;
                this.angle = Math.random() * Math.PI * 2;
                
                // Create ring effect for some particles
                if (isRing) {
                    this.speed = 8 + Math.random() * 2;
                } else {
                    this.speed = 2 + Math.random() * 8;
                }
                
                this.friction = 0.94;
                this.gravity = 0.2;
                this.opacity = 1;
                this.decay = Math.random() * 0.015 + 0.01;
                this.vx = Math.cos(this.angle) * this.speed;
                this.vy = Math.sin(this.angle) * this.speed;
                this.size = Math.random() * 2 + 1.5;
                this.brightness = 50 + Math.random() * 30;
            }

            update() {
                this.vx *= this.friction;
                this.vy *= this.friction;
                this.vy += this.gravity;
                this.x += this.vx;
                this.y += this.vy;
                this.opacity -= this.decay;
                this.brightness -= 0.5;
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                
                // Draw glow
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2);
                gradient.addColorStop(0, `hsla(${this.hue}, 100%, ${this.brightness}%, ${this.opacity})`);
                gradient.addColorStop(1, `hsla(${this.hue}, 100%, ${this.brightness}%, 0)`);
                ctx.fillStyle = gradient;
                ctx.fill();
                
                // Draw bright center
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${this.hue}, 100%, ${this.brightness + 30}%)`;
                ctx.fill();
                
                ctx.restore();
            }

            isDead() {
                return this.opacity <= 0;
            }
        }

        // Create initial fireworks with staggered timing
        console.log('🎆 FireworksEffect: Creating initial fireworks...');
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                fireworksRef.current.push(new Firework());
                console.log('🎆 Created firework', i + 1);
            }, i * 500);
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

            // Create new fireworks with varied timing
            if (Math.random() < 0.02 && fireworksRef.current.length < 3) {
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
                backgroundColor: 'transparent'
            }}
        />
    );
};

export default FireworksEffect;

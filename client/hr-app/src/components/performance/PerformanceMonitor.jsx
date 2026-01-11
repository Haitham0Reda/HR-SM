import { useEffect, useRef } from 'react';

/**
 * Performance monitoring component
 * Tracks component render performance and warns about issues
 */
const PerformanceMonitor = ({ 
  componentName, 
  enabled = process.env.NODE_ENV === 'development',
  warnThreshold = 16 // ms
}) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const renderTimes = useRef([]);

  useEffect(() => {
    if (!enabled) return;

    const now = Date.now();
    const renderTime = now - lastRenderTime.current;
    renderCount.current += 1;
    renderTimes.current.push(renderTime);

    // Keep only last 10 render times
    if (renderTimes.current.length > 10) {
      renderTimes.current.shift();
    }

    // Calculate average render time
    const avgRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;

    // Warn if render time is above threshold
    if (renderTime > warnThreshold) {
      console.warn(`⚠️ Performance: ${componentName} render took ${renderTime}ms (avg: ${avgRenderTime.toFixed(1)}ms)`);
    }

    // Warn if component is re-rendering too frequently
    if (renderCount.current > 5 && renderTime < 100) {
      console.warn(`⚠️ Performance: ${componentName} has rendered ${renderCount.current} times rapidly`);
    }

    lastRenderTime.current = now;
  });

  return null; // This component doesn't render anything
};

export default PerformanceMonitor;
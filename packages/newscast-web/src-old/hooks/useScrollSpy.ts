import { useState, useEffect, useMemo } from 'react';

export interface ScrollSpyOptions {
  rootMargin?: string;
  threshold?: number | number[];
}

/**
 * Hook to track which element is currently visible in the viewport
 * Based on Intersection Observer API
 */
export const useScrollSpy = (
  elementIds: string[],
  options: ScrollSpyOptions = {}
) => {
  const [activeId, setActiveId] = useState<string>('');

  // elementIds와 options 메모화하여 무한 루프 방지
  const memoizedElementIds = useMemo(() => elementIds, [elementIds.join(',')]);
  const memoizedRootMargin = useMemo(() => options.rootMargin, [options.rootMargin]);
  const memoizedThreshold = useMemo(() => options.threshold, [
    Array.isArray(options.threshold) ? options.threshold.join(',') : options.threshold
  ]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry with the highest intersection ratio
        let maxRatio = 0;
        let mostVisibleId = '';

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            mostVisibleId = entry.target.id;
          }
        });

        // If we found a visible element, set it as active
        if (mostVisibleId) {
          setActiveId(mostVisibleId);
        }
      },
      {
        rootMargin: memoizedRootMargin || '-20% 0px -70% 0px',
        threshold: memoizedThreshold || [0, 0.25, 0.5, 0.75, 1.0],
      }
    );

    // Observe all elements
    memoizedElementIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [memoizedElementIds, memoizedRootMargin, memoizedThreshold]);

  return activeId;
};

/**
 * Alternative scroll spy that uses scroll position calculation
 * More performant for large lists but less accurate
 */
export const useScrollSpyByPosition = (elementIds: string[]) => {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 3;

      for (let i = elementIds.length - 1; i >= 0; i--) {
        const element = document.getElementById(elementIds[i]);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveId(elementIds[i]);
          break;
        }
      }
    };

    // Set initial active element
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [elementIds]);

  return activeId;
};
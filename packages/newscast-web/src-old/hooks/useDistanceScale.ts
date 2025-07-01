import { useState, useEffect, useRef, useMemo } from 'react';

interface DistanceScaleOptions {
  minScale?: number;
  maxScale?: number;
  centerOffset?: number;
}

/**
 * Hook to calculate scale based on distance from viewport center
 * Elements closer to center get larger scale, elements further away get smaller scale
 */
export const useDistanceScale = (
  elementIds: string[],
  options: DistanceScaleOptions = {}
) => {
  const {
    minScale = 0.9,
    maxScale = 1.05,
    centerOffset = 0
  } = options;

  const [scales, setScales] = useState<Record<string, number>>({});
  const rafRef = useRef<number | undefined>(undefined);

  // elementIds 메모화하여 무한 루프 방지
  const memoizedElementIds = useMemo(() => elementIds, [elementIds.join(',')]);
  
  // 옵션들 메모화
  const memoizedOptions = useMemo(() => ({
    minScale,
    maxScale,
    centerOffset
  }), [minScale, maxScale, centerOffset]);

  const calculateScales = () => {
    const newScales: Record<string, number> = {};
    const viewportHeight = window.innerHeight;
    const viewportCenter = viewportHeight / 2 + memoizedOptions.centerOffset;

    memoizedElementIds.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      
      // Calculate distance from viewport center
      const distance = Math.abs(elementCenter - viewportCenter);
      
      // Normalize distance (0 to 1, where 0 is center, 1 is max distance)
      const maxDistance = viewportHeight / 2;
      const normalizedDistance = Math.min(distance / maxDistance, 1);
      
      // Calculate scale: closer to center = larger scale
      const scale = memoizedOptions.maxScale - (normalizedDistance * (memoizedOptions.maxScale - memoizedOptions.minScale));
      
      newScales[id] = Math.max(memoizedOptions.minScale, Math.min(memoizedOptions.maxScale, scale));
    });

    setScales(newScales);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      
      rafRef.current = requestAnimationFrame(calculateScales);
    };

    const handleResize = () => {
      calculateScales();
    };

    // Initial calculation
    calculateScales();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [memoizedElementIds, memoizedOptions]);

  return scales;
};
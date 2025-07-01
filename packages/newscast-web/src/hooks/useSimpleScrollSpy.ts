import { useState, useEffect, useMemo } from 'react';

export const useSimpleScrollSpy = (elementIds: string[]) => {
  const [activeId, setActiveId] = useState<string>('');

  // elementIds를 안정된 문자열로 메모화
  const stableElementIds = useMemo(() => elementIds, [elementIds.join(',')]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let maxRatio = 0;
        let mostVisibleId = '';

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            mostVisibleId = entry.target.id;
          }
        });

        if (mostVisibleId) {
          setActiveId(mostVisibleId);
        }
      },
      {
        rootMargin: '-50% 0px -50% 0px', // 정확히 중앙에서 활성화
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
      }
    );

    // 모든 요소 관찰
    stableElementIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [stableElementIds]);

  return activeId;
};
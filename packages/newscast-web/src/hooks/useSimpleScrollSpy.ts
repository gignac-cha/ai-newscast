import { useState, useEffect, useMemo } from 'react';

export const useSimpleScrollSpy = (elementIDs: string[]) => {
  const [activeID, setActiveID] = useState<string>('');

  // elementIDs를 안정된 참조로 메모화 (깊은 비교 대신 문자열 비교)
  const stableElementIDs = useMemo(() => elementIDs, [elementIDs.join(',')]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let maxRatio = 0;
        let mostVisibleID = '';

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            mostVisibleID = entry.target.id;
          }
        });

        if (mostVisibleID) {
          setActiveID(mostVisibleID);
        }
      },
      {
        rootMargin: '-50% 0px -50% 0px', // 정확히 중앙에서 활성화
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
      }
    );

    // 모든 요소 관찰
    stableElementIDs.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [stableElementIDs]);

  return activeID;
};
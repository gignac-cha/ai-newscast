/**
 * Work Scheduler
 *
 * 시간 기반 작업 스케줄링 로직
 */

/**
 * 작업 타입 정의
 */
export type WorkType =
	| { type: 'CRAWL_TOPICS' }
	| { type: 'CRAWL_NEWS' }
	| { type: 'GENERATE_NEWS'; topicIndex: number }
	| { type: 'GENERATE_SCRIPT'; topicIndex: number }
	| { type: 'GENERATE_AUDIO'; topicIndex: number }
	| { type: 'MERGE_NEWSCAST'; topicIndex: number }
	| { type: 'COMPLETE' };

/**
 * 시간 → 작업 매핑
 *
 * 현재 UTC 시간을 기반으로 실행할 작업을 결정
 */
export function determineWork(hour: number, minute: number): WorkType | null {
	// 09:05 UTC - 토픽 크롤링
	if (hour === 9 && minute === 5) {
		return { type: 'CRAWL_TOPICS' };
	}

	// 09:11-09:40 UTC - 뉴스 크롤링 (매분)
	if (hour === 9 && minute >= 11 && minute <= 40) {
		return { type: 'CRAWL_NEWS' };
	}

	// 09:41-09:50 UTC - 뉴스 통합 (토픽별)
	if (hour === 9 && minute >= 41 && minute <= 50) {
		const topicIndex = minute - 40; // 41분 → 1, 50분 → 10
		return { type: 'GENERATE_NEWS', topicIndex };
	}

	// 09:51-10:00 UTC - 스크립트 생성 (토픽별)
	if ((hour === 9 && minute >= 51) || (hour === 10 && minute === 0)) {
		const topicIndex = hour === 9 ? minute - 50 : 10; // 51분 → 1, 10:00 → 10
		return { type: 'GENERATE_SCRIPT', topicIndex };
	}

	// 10:01-10:10 UTC - 오디오 생성 (토픽별)
	if (hour === 10 && minute >= 1 && minute <= 10) {
		const topicIndex = minute; // 1분 → 1, 10분 → 10
		return { type: 'GENERATE_AUDIO', topicIndex };
	}

	// 10:11-10:20 UTC - 오디오 병합 (토픽별)
	if (hour === 10 && minute >= 11 && minute <= 20) {
		const topicIndex = minute - 10; // 11분 → 1, 20분 → 10
		return { type: 'MERGE_NEWSCAST', topicIndex };
	}

	// 10:30 UTC - 파이프라인 완료
	if (hour === 10 && minute === 30) {
		return { type: 'COMPLETE' };
	}

	return null;
}

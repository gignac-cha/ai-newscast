import { useMemo } from 'react';
import type { NewscastTopic } from '../types/newscast';

interface AudioFileInfo {
  file_path: string;
  sequence: number;
  type: string;
  host_id: string;
  duration_seconds: number;
}

interface AudioFilesData {
  audio_files: AudioFileInfo[];
  all_segments: Array<{
    sequence: number;
    type: string;
    role: string;
    content: string;
    has_audio: boolean;
  }>;
}

export function useCurrentScript(
  topic: NewscastTopic | null,
  currentTime: number
): {
  currentScript: string | null;
  currentSpeaker: string | null;
  progress: number;
  totalSegments: number;
  currentSegmentIndex: number;
} {
  return useMemo(() => {
    
    if (!topic?.script || !topic.audioFiles) {
      return {
        currentScript: null,
        currentSpeaker: null,
        progress: 0,
        totalSegments: 0,
        currentSegmentIndex: -1,
      };
    }

    // 오디오 파일들을 시간 순서대로 누적 시간 계산
    let accumulatedTime = 0;
    const timeMap: Array<{
      startTime: number;
      endTime: number;
      sequence: number;
      duration: number;
    }> = [];

    // audio_files는 이미 sequence 순서대로 정렬되어 있다고 가정
    topic.audioFiles.audio_files.forEach((audioFile) => {
      const startTime = accumulatedTime;
      const endTime = accumulatedTime + audioFile.duration_seconds;
      
      timeMap.push({
        startTime,
        endTime,
        sequence: audioFile.sequence,
        duration: audioFile.duration_seconds,
      });
      
      
      accumulatedTime = endTime;
    });

    // 현재 시간에 해당하는 세그먼트 찾기
    const currentSegment = timeMap.find(
      (segment) => currentTime >= segment.startTime && currentTime < segment.endTime
    );



    if (!currentSegment) {
      return {
        currentScript: null,
        currentSpeaker: null,
        progress: 0,
        totalSegments: timeMap.length,
        currentSegmentIndex: -1,
      };
    }

    // 스크립트에서 해당 sequence의 대화 찾기
    const scriptLine = topic.script.script.find(
      (line) => 
        line.type === 'dialogue' && 
        topic.audioFiles.all_segments.find(
          (seg) => seg.sequence === currentSegment.sequence && seg.content === line.content
        )
    );

    // all_segments에서 직접 해당 sequence의 대화 찾기
    const segment = topic.audioFiles?.all_segments.find(
      (seg: any) => seg.sequence === currentSegment.sequence && seg.type === 'dialogue'
    );


    const segmentProgress = 
      (currentTime - currentSegment.startTime) / currentSegment.duration;

    const currentSegmentIndex = timeMap.findIndex(
      (segment) => segment.sequence === currentSegment.sequence
    );

    // segment에서 찾은 정보를 우선 사용, 없으면 scriptLine 사용
    const finalScript = segment?.content || scriptLine?.content || null;
    let finalSpeaker = segment?.role || scriptLine?.name || null;
    
    // host1, host2를 실제 호스트 이름으로 변환
    if (finalSpeaker && topic?.script?.hosts) {
      if (finalSpeaker === 'host1') {
        finalSpeaker = topic.script.hosts.host1.name;
      } else if (finalSpeaker === 'host2') {
        finalSpeaker = topic.script.hosts.host2.name;
      }
    }

    return {
      currentScript: finalScript,
      currentSpeaker: finalSpeaker,
      progress: Math.min(Math.max(segmentProgress, 0), 1),
      totalSegments: timeMap.length,
      currentSegmentIndex,
    };
  }, [topic, currentTime]);
}
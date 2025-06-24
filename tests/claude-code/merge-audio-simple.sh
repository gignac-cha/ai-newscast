#!/bin/bash

# 뉴스캐스트 오디오 병합 스크립트
# 사용법: ./merge-audio-simple.sh <audio-folder> [output-file]

if [ $# -lt 1 ]; then
    echo "사용법: $0 <audio-folder> [output-file]"
    echo "예시: $0 bigkinds/2025-06-21T17:20:21.389037/topic-01/audio"
    echo "      $0 bigkinds/2025-06-21T17:20:21.389037/topic-01/audio newscast-final.mp3"
    exit 1
fi

AUDIO_FOLDER="$1"
OUTPUT_FILE="${2:-newscast-merged-$(date +%Y%m%d_%H%M%S).mp3}"

# 절대 경로로 변환
AUDIO_FOLDER=$(realpath "$AUDIO_FOLDER")

# 폴더 존재 확인
if [ ! -d "$AUDIO_FOLDER" ]; then
    echo "❌ 오디오 폴더를 찾을 수 없습니다: $AUDIO_FOLDER"
    exit 1
fi

echo "🎵 뉴스캐스트 오디오 병합 시작..."
echo "📁 입력 폴더: $AUDIO_FOLDER"
echo "📄 출력 파일: $OUTPUT_FILE"

# dialogue 타입 MP3 파일들을 sequence 순으로 정렬
AUDIO_FILES=($(ls "$AUDIO_FOLDER"/*-dialogue-*.mp3 2>/dev/null | sort -V))

if [ ${#AUDIO_FILES[@]} -eq 0 ]; then
    echo "❌ dialogue 타입 MP3 파일을 찾을 수 없습니다."
    echo "💡 파일명 형식: XXX-dialogue-speaker.mp3"
    exit 1
fi

echo "📊 찾은 오디오 파일: ${#AUDIO_FILES[@]}개"

# 파일 목록 출력
for i in "${!AUDIO_FILES[@]}"; do
    filename=$(basename "${AUDIO_FILES[$i]}")
    echo "   $(printf '%2d' $((i+1))). $filename"
done

# FFmpeg 입력 파라미터 생성
INPUT_PARAMS=""
for file in "${AUDIO_FILES[@]}"; do
    INPUT_PARAMS="$INPUT_PARAMS -i \"$file\""
done

# filter_complex 파라미터 생성
FILTER_COMPLEX=""
if [ ${#AUDIO_FILES[@]} -eq 1 ]; then
    # 파일이 1개인 경우
    FILTER_COMPLEX="[0:0]acopy[out]"
else
    # 파일이 여러 개인 경우
    INPUTS=""
    for i in $(seq 0 $((${#AUDIO_FILES[@]}-1))); do
        INPUTS="$INPUTS[$i:0]"
    done
    FILTER_COMPLEX="${INPUTS}concat=n=${#AUDIO_FILES[@]}:v=0:a=1[out]"
fi

echo ""
echo "🔧 FFmpeg 명령 생성 중..."
echo "   입력 파일: ${#AUDIO_FILES[@]}개"
echo "   필터: $FILTER_COMPLEX"

# FFmpeg 명령 실행
echo ""
echo "▶️  FFmpeg 실행 중..."

eval ffmpeg $INPUT_PARAMS \
    -filter_complex "'$FILTER_COMPLEX'" \
    -map "'[out]'" \
    -y \
    "\"$OUTPUT_FILE\""

# 결과 확인
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 오디오 병합 완료!"
    
    # 파일 정보 출력
    if command -v ffprobe >/dev/null 2>&1; then
        echo ""
        echo "📊 최종 파일 정보:"
        DURATION=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$OUTPUT_FILE" 2>/dev/null)
        if [ -n "$DURATION" ]; then
            MINUTES=$(echo "$DURATION" | awk '{print int($1/60)}')
            SECONDS=$(echo "$DURATION" | awk '{print int($1%60)}')
            echo "   ⏱️  재생 시간: ${MINUTES}분 ${SECONDS}초"
        fi
        
        FILE_SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
        echo "   💾 파일 크기: $FILE_SIZE"
    fi
    
    echo "   📁 저장 위치: $OUTPUT_FILE"
    echo ""
    echo "🎊 완성된 뉴스캐스트 오디오를 재생해보세요!"
else
    echo ""
    echo "❌ FFmpeg 실행 중 오류가 발생했습니다."
    exit 1
fi
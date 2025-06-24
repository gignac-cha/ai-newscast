#!/bin/bash

# AI 뉴스캐스트 전체 파이프라인 실행 스크립트
# 사용법: ./run-full-pipeline.sh

set -e  # 오류 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'  
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 로그 함수들
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_stage() {
    echo -e "\n${PURPLE}🚀 STAGE $1: $2${NC}"
    echo "=================================================="
}

# 시작 시간 기록
PIPELINE_START_TIME=$(date +%s)
TIMESTAMP=$(date +%Y-%m-%dT%H:%M:%S.%6N)

log_info "AI 뉴스캐스트 전체 파이프라인을 시작합니다..."
log_info "실행 시작 시간: $(date)"
log_info "타임스탬프: $TIMESTAMP"

# 필수 파일 확인
log_info "필수 파일 존재 확인 중..."
REQUIRED_FILES=(
    "bigkinds_topic_list.py"
    "get_news_list.py" 
    "get_news_details.py"
    "consolidate-news.ts"
    "generate-newscast-script.ts"
    "generate-newscast-audio.ts"
    "merge-audio-simple.sh"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        log_error "필수 파일을 찾을 수 없습니다: $file"
        exit 1
    fi
done
log_success "모든 필수 파일 확인 완료"

# 1단계: 토픽 10개 추출
log_stage "1" "BigKinds에서 토픽 10개 추출"
python3 bigkinds_topic_list.py
if [ $? -eq 0 ]; then
    log_success "토픽 추출 완료"
else
    log_error "토픽 추출 실패"
    exit 1
fi

# 생성된 폴더 찾기
BIGKINDS_FOLDER=$(ls -td bigkinds/20*/ | head -1 | sed 's/\/$//')
if [ -z "$BIGKINDS_FOLDER" ]; then
    log_error "BigKinds 폴더를 찾을 수 없습니다"
    exit 1
fi
log_info "작업 폴더: $BIGKINDS_FOLDER"

# 토픽 개수 확인 및 폴더 생성
TOPIC_COUNT=$(find "$BIGKINDS_FOLDER" -maxdepth 1 -name "topic-*" -type d | wc -l)

if [ $TOPIC_COUNT -eq 0 ]; then
    log_warning "토픽 폴더가 없습니다. 10개 토픽 폴더를 생성합니다..."
    
    # 토픽 폴더 생성
    for i in {01..10}; do
        mkdir -p "$BIGKINDS_FOLDER/topic-$i"
    done
    
    TOPIC_COUNT=10
fi

log_info "발견된 토픽 개수: $TOPIC_COUNT개"

# 2단계: 모든 토픽의 뉴스 목록 수집
log_stage "2" "모든 토픽의 뉴스 목록 수집"
for i in $(seq 1 $TOPIC_COUNT); do
    TOPIC_NUM=$(printf "%02d" $i)
    log_info "토픽 $TOPIC_NUM 뉴스 목록 수집 중..."
    
    python3 get_news_list.py "$BIGKINDS_FOLDER" $i
    if [ $? -eq 0 ]; then
        log_success "토픽 $TOPIC_NUM 뉴스 목록 수집 완료"
    else
        log_error "토픽 $TOPIC_NUM 뉴스 목록 수집 실패"
        exit 1
    fi
done

# 3단계: 모든 토픽의 뉴스 상세내용 수집
log_stage "3" "모든 토픽의 뉴스 상세내용 수집"
for i in $(seq 1 $TOPIC_COUNT); do
    TOPIC_NUM=$(printf "%02d" $i)
    log_info "토픽 $TOPIC_NUM 뉴스 상세내용 수집 중..."
    
    python3 get_news_details.py "$BIGKINDS_FOLDER" $i
    if [ $? -eq 0 ]; then
        log_success "토픽 $TOPIC_NUM 뉴스 상세내용 수집 완료"
    else
        log_error "토픽 $TOPIC_NUM 뉴스 상세내용 수집 실패"
        exit 1
    fi
done

# 4단계: 모든 토픽의 뉴스 통합
log_stage "4" "모든 토픽의 뉴스 통합"
for i in $(seq 1 $TOPIC_COUNT); do
    TOPIC_NUM=$(printf "%02d" $i)
    log_info "토픽 $TOPIC_NUM 뉴스 통합 중..."
    
    TOPIC_FOLDER_PATH="$BIGKINDS_FOLDER/topic-$TOPIC_NUM"
    node --experimental-transform-types consolidate-news.ts "$TOPIC_FOLDER_PATH"
    if [ $? -eq 0 ]; then
        log_success "토픽 $TOPIC_NUM 뉴스 통합 완료"
    else
        log_error "토픽 $TOPIC_NUM 뉴스 통합 실패"
        exit 1
    fi
done

# 5단계: 모든 토픽의 뉴스캐스트 스크립트 생성
log_stage "5" "모든 토픽의 뉴스캐스트 스크립트 생성"
for i in $(seq 1 $TOPIC_COUNT); do
    TOPIC_NUM=$(printf "%02d" $i)
    log_info "토픽 $TOPIC_NUM 뉴스캐스트 스크립트 생성 중..."
    
    node --experimental-transform-types generate-newscast-script.ts "$BIGKINDS_FOLDER" $i
    if [ $? -eq 0 ]; then
        log_success "토픽 $TOPIC_NUM 뉴스캐스트 스크립트 생성 완료"
    else
        log_error "토픽 $TOPIC_NUM 뉴스캐스트 스크립트 생성 실패"
        exit 1
    fi
done

# 6단계: 모든 토픽의 TTS 오디오 생성
log_stage "6" "모든 토픽의 TTS 오디오 생성"
for i in $(seq 1 $TOPIC_COUNT); do
    TOPIC_NUM=$(printf "%02d" $i)
    log_info "토픽 $TOPIC_NUM TTS 오디오 생성 중..."
    
    node --experimental-transform-types generate-newscast-audio.ts "$BIGKINDS_FOLDER" $i
    if [ $? -eq 0 ]; then
        log_success "토픽 $TOPIC_NUM TTS 오디오 생성 완료"
    else
        log_error "토픽 $TOPIC_NUM TTS 오디오 생성 실패"
        exit 1
    fi
done

# 7단계: 모든 토픽의 오디오 병합
log_stage "7" "모든 토픽의 오디오 병합"
for i in $(seq 1 $TOPIC_COUNT); do
    TOPIC_NUM=$(printf "%02d" $i)
    log_info "토픽 $TOPIC_NUM 오디오 병합 중..."
    
    AUDIO_FOLDER="$BIGKINDS_FOLDER/topic-$TOPIC_NUM/audio"
    OUTPUT_FILE="$BIGKINDS_FOLDER/topic-$TOPIC_NUM/newscast-final.mp3"
    
    if [ -d "$AUDIO_FOLDER" ]; then
        ./merge-audio-simple.sh "$AUDIO_FOLDER" "$OUTPUT_FILE"
        if [ $? -eq 0 ]; then
            log_success "토픽 $TOPIC_NUM 오디오 병합 완료"
        else
            log_error "토픽 $TOPIC_NUM 오디오 병합 실패"
            exit 1
        fi
    else
        log_warning "토픽 $TOPIC_NUM 오디오 폴더를 찾을 수 없습니다: $AUDIO_FOLDER"
    fi
done

# 최종 결과 정리
log_stage "완료" "전체 파이프라인 실행 완료"

PIPELINE_END_TIME=$(date +%s)
TOTAL_TIME=$((PIPELINE_END_TIME - PIPELINE_START_TIME))
MINUTES=$((TOTAL_TIME / 60))
SECONDS=$((TOTAL_TIME % 60))

echo -e "\n${CYAN}📊 최종 결과 요약${NC}"
echo "=================================================="
log_info "처리된 토픽 수: $TOPIC_COUNT개"
log_info "작업 폴더: $BIGKINDS_FOLDER"
log_info "총 소요 시간: ${MINUTES}분 ${SECONDS}초"

# 생성된 파일들 확인
echo -e "\n${CYAN}📁 생성된 파일들${NC}"
echo "=================================================="
for i in $(seq 1 $TOPIC_COUNT); do
    TOPIC_NUM=$(printf "%02d" $i)
    TOPIC_FOLDER="$BIGKINDS_FOLDER/topic-$TOPIC_NUM"
    
    if [ -d "$TOPIC_FOLDER" ]; then
        echo -e "\n${YELLOW}토픽 $TOPIC_NUM:${NC}"
        
        # 주요 파일들 확인
        [ -f "$TOPIC_FOLDER/news-list.json" ] && echo "  ✅ 뉴스 목록"
        [ -f "$TOPIC_FOLDER/news.json" ] && echo "  ✅ 통합 뉴스"
        [ -f "$TOPIC_FOLDER/newscast-script.json" ] && echo "  ✅ 뉴스캐스트 스크립트"
        [ -d "$TOPIC_FOLDER/audio" ] && echo "  ✅ TTS 오디오 파일들 ($(ls $TOPIC_FOLDER/audio/*.mp3 2>/dev/null | wc -l)개)"
        [ -f "$TOPIC_FOLDER/newscast-final.mp3" ] && echo "  ✅ 최종 뉴스캐스트 오디오"
        
        # 토픽 제목 표시
        if [ -f "$TOPIC_FOLDER/news.json" ]; then
            TOPIC_TITLE=$(cat "$TOPIC_FOLDER/news.json" | jq -r '.topic' 2>/dev/null)
            if [ "$TOPIC_TITLE" != "null" ] && [ -n "$TOPIC_TITLE" ]; then
                echo "  📰 주제: $TOPIC_TITLE"
            fi
        fi
    fi
done

echo -e "\n${GREEN}🎉 전체 파이프라인이 성공적으로 완료되었습니다!${NC}"
echo -e "${CYAN}💡 각 토픽의 최종 뉴스캐스트는 다음 위치에서 확인할 수 있습니다:${NC}"
echo -e "   $BIGKINDS_FOLDER/topic-XX/newscast-final.mp3"

# 플레이리스트 생성 제안
echo -e "\n${YELLOW}📻 전체 뉴스캐스트 플레이리스트를 생성하시겠습니까? (y/N)${NC}"
read -r RESPONSE
if [[ "$RESPONSE" =~ ^[Yy]$ ]]; then
    PLAYLIST_FILE="$BIGKINDS_FOLDER/newscast-playlist.m3u"
    echo "# AI 뉴스캐스트 플레이리스트 - $(date)" > "$PLAYLIST_FILE"
    
    for i in $(seq 1 $TOPIC_COUNT); do
        TOPIC_NUM=$(printf "%02d" $i)
        FINAL_AUDIO="$BIGKINDS_FOLDER/topic-$TOPIC_NUM/newscast-final.mp3"
        
        if [ -f "$FINAL_AUDIO" ]; then
            echo "topic-$TOPIC_NUM/newscast-final.mp3" >> "$PLAYLIST_FILE"
        fi
    done
    
    log_success "플레이리스트 생성 완료: $PLAYLIST_FILE"
fi

echo -e "\n${GREEN}감사합니다! 🎊${NC}"
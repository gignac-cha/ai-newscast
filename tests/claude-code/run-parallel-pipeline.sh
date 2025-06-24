#!/bin/bash

# AI 뉴스캐스트 병렬 처리 파이프라인 실행 스크립트
# 사용법: ./run-parallel-pipeline.sh <bigkinds-folder>

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

# 인자 확인
if [ $# -lt 1 ]; then
    echo "사용법: $0 <bigkinds-folder>"
    echo "예시: $0 bigkinds/2025-06-21T21:16:12.443360"
    echo ""
    echo "💡 이 스크립트는 이미 1-3단계가 완료된 상태에서"
    echo "   4-7단계 (AI 통합 → 스크립트 → TTS → 병합)를 병렬로 실행합니다."
    exit 1
fi

BIGKINDS_FOLDER="$1"

# 절대 경로로 변환
BIGKINDS_FOLDER=$(realpath "$BIGKINDS_FOLDER")

# 폴더 존재 확인
if [ ! -d "$BIGKINDS_FOLDER" ]; then
    log_error "BigKinds 폴더를 찾을 수 없습니다: $BIGKINDS_FOLDER"
    exit 1
fi

log_info "AI 뉴스캐스트 병렬 파이프라인을 시작합니다..."
log_info "실행 시작 시간: $(date)"
log_info "작업 폴더: $BIGKINDS_FOLDER"

# 토픽 개수 확인
TOPIC_COUNT=$(find "$BIGKINDS_FOLDER" -maxdepth 1 -name "topic-*" -type d | wc -l)
log_info "발견된 토픽 개수: $TOPIC_COUNT개"

if [ $TOPIC_COUNT -eq 0 ]; then
    log_error "토픽 폴더를 찾을 수 없습니다"
    exit 1
fi

# 최대 동시 실행 프로세스 수 (API rate limit 고려)
MAX_PARALLEL=3
log_info "최대 병렬 실행: ${MAX_PARALLEL}개 토픽"

# 개별 토픽 처리 함수
process_topic() {
    local topic_num=$1
    local topic_folder="$BIGKINDS_FOLDER/topic-$(printf "%02d" $topic_num)"
    
    log_info "[토픽 $topic_num] 처리 시작..."
    
    # 4단계: 뉴스 통합
    log_info "[토픽 $topic_num] 뉴스 통합 중..."
    if node --experimental-transform-types consolidate-news.ts "$topic_folder" > "$topic_folder/consolidate.log" 2>&1; then
        log_success "[토픽 $topic_num] 뉴스 통합 완료"
    else
        log_error "[토픽 $topic_num] 뉴스 통합 실패"
        return 1
    fi
    
    # 5단계: 뉴스캐스트 스크립트 생성
    log_info "[토픽 $topic_num] 스크립트 생성 중..."
    if node --experimental-transform-types generate-newscast-script.ts "$BIGKINDS_FOLDER" $topic_num > "$topic_folder/script.log" 2>&1; then
        log_success "[토픽 $topic_num] 스크립트 생성 완료"
    else
        log_error "[토픽 $topic_num] 스크립트 생성 실패"
        return 1
    fi
    
    # 6단계: TTS 오디오 생성
    log_info "[토픽 $topic_num] TTS 오디오 생성 중..."
    if node --experimental-transform-types generate-newscast-audio.ts "$BIGKINDS_FOLDER" $topic_num > "$topic_folder/audio.log" 2>&1; then
        log_success "[토픽 $topic_num] TTS 오디오 생성 완료"
    else
        log_error "[토픽 $topic_num] TTS 오디오 생성 실패"
        return 1
    fi
    
    # 7단계: 오디오 병합
    log_info "[토픽 $topic_num] 오디오 병합 중..."
    local audio_folder="$topic_folder/audio"
    local output_file="$topic_folder/newscast-final.mp3"
    
    if [ -d "$audio_folder" ]; then
        if ./merge-audio-simple.sh "$audio_folder" "$output_file" > "$topic_folder/merge.log" 2>&1; then
            log_success "[토픽 $topic_num] 오디오 병합 완료"
        else
            log_error "[토픽 $topic_num] 오디오 병합 실패"
            return 1
        fi
    else
        log_warning "[토픽 $topic_num] 오디오 폴더를 찾을 수 없습니다"
        return 1
    fi
    
    log_success "[토픽 $topic_num] 전체 처리 완료!"
    return 0
}

# 병렬 처리 시작
log_stage "병렬" "10개 토픽 병렬 처리 (최대 ${MAX_PARALLEL}개 동시)"

# 백그라운드 작업 관리
declare -a pids=()
declare -a results=()

# 토픽들을 병렬로 처리
for i in $(seq 1 $TOPIC_COUNT); do
    # 현재 실행 중인 프로세스가 MAX_PARALLEL 이상이면 대기
    while [ ${#pids[@]} -ge $MAX_PARALLEL ]; do
        for j in "${!pids[@]}"; do
            pid=${pids[$j]}
            if ! kill -0 $pid 2>/dev/null; then
                # 프로세스가 완료됨
                wait $pid
                results[$j]=$?
                unset pids[$j]
            fi
        done
        # 배열 재구성
        pids=($(printf '%s\n' "${pids[@]}" | grep -v '^$'))
        sleep 1
    done
    
    # 새 토픽 처리 시작
    (
        process_topic $i
        echo $? > "$BIGKINDS_FOLDER/topic-$(printf "%02d" $i)/result.tmp"
    ) &
    
    pids+=($!)
    log_info "토픽 $i 백그라운드 처리 시작 (PID: $!)"
    
    # API rate limit 고려한 간격 (1초 대기)
    sleep 1
done

# 모든 백그라운드 작업 완료 대기
log_info "모든 백그라운드 작업 완료 대기 중..."
for pid in "${pids[@]}"; do
    if [ -n "$pid" ]; then
        wait $pid
    fi
done

# 결과 확인
log_stage "결과" "전체 처리 결과 확인"

success_count=0
failed_topics=()

for i in $(seq 1 $TOPIC_COUNT); do
    result_file="$BIGKINDS_FOLDER/topic-$(printf "%02d" $i)/result.tmp"
    if [ -f "$result_file" ]; then
        result=$(cat "$result_file")
        rm -f "$result_file"
        
        if [ "$result" -eq 0 ]; then
            success_count=$((success_count + 1))
            log_success "토픽 $i: 성공"
        else
            failed_topics+=($i)
            log_error "토픽 $i: 실패"
        fi
    else
        failed_topics+=($i)
        log_error "토픽 $i: 결과 파일 없음"
    fi
done

# 최종 결과 정리
PIPELINE_END_TIME=$(date +%s)
TOTAL_TIME=$((PIPELINE_END_TIME - PIPELINE_START_TIME))
MINUTES=$((TOTAL_TIME / 60))
SECONDS=$((TOTAL_TIME % 60))

echo -e "\n${CYAN}📊 최종 병렬 처리 결과${NC}"
echo "=================================================="
log_info "총 토픽 수: $TOPIC_COUNT개"
log_info "성공한 토픽: $success_count개"
log_info "실패한 토픽: ${#failed_topics[@]}개"
log_info "병렬 처리 시간: ${MINUTES}분 ${SECONDS}초"

if [ ${#failed_topics[@]} -gt 0 ]; then
    log_warning "실패한 토픽들: ${failed_topics[*]}"
fi

# 생성된 파일들 확인
echo -e "\n${CYAN}📁 생성된 최종 뉴스캐스트${NC}"
echo "=================================================="
for i in $(seq 1 $TOPIC_COUNT); do
    TOPIC_NUM=$(printf "%02d" $i)
    FINAL_AUDIO="$BIGKINDS_FOLDER/topic-$TOPIC_NUM/newscast-final.mp3"
    
    if [ -f "$FINAL_AUDIO" ]; then
        # 토픽 제목 표시
        if [ -f "$BIGKINDS_FOLDER/topic-$TOPIC_NUM/news.json" ]; then
            TOPIC_TITLE=$(cat "$BIGKINDS_FOLDER/topic-$TOPIC_NUM/news.json" | jq -r '.topic' 2>/dev/null)
            if [ "$TOPIC_TITLE" != "null" ] && [ -n "$TOPIC_TITLE" ]; then
                echo -e "${GREEN}✅ 토픽 $TOPIC_NUM: $TOPIC_TITLE${NC}"
                
                # 파일 크기와 길이 정보
                FILE_SIZE=$(ls -lh "$FINAL_AUDIO" | awk '{print $5}')
                if command -v ffprobe >/dev/null 2>&1; then
                    DURATION=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$FINAL_AUDIO" 2>/dev/null)
                    if [ -n "$DURATION" ]; then
                        MINUTES_AUDIO=$(echo "$DURATION" | awk '{print int($1/60)}')
                        SECONDS_AUDIO=$(echo "$DURATION" | awk '{print int($1%60)}')
                        echo -e "   📊 ${MINUTES_AUDIO}분 ${SECONDS_AUDIO}초, $FILE_SIZE"
                    fi
                fi
            fi
        fi
    else
        echo -e "${RED}❌ 토픽 $TOPIC_NUM: 뉴스캐스트 생성 실패${NC}"
    fi
done

if [ $success_count -eq $TOPIC_COUNT ]; then
    echo -e "\n${GREEN}🎉 모든 토픽의 뉴스캐스트가 성공적으로 생성되었습니다!${NC}"
    echo -e "${CYAN}⚡ 병렬 처리로 시간을 크게 단축했습니다!${NC}"
else
    echo -e "\n${YELLOW}⚠️  일부 토픽 처리에 실패했습니다. 로그를 확인해주세요.${NC}"
fi

echo -e "\n${GREEN}감사합니다! 🎊${NC}"
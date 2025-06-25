#!/bin/bash

# AI News Cast - 완전 자동화 파이프라인
# 토픽 수집부터 최종 오디오까지 한 번에 실행

set -e  # 오류 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 로그 함수
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

log_step() {
    echo -e "\n${CYAN}🚀 단계 $1: $2${NC}"
    echo "=================================================="
}

# 기본값 설정
MAX_TOPICS=10
SKIP_AUDIO=false
VERBOSE=false

# 사용법 표시
show_usage() {
    echo "AI News Cast - 완전 자동화 파이프라인"
    echo ""
    echo "사용법: $0 [OPTIONS]"
    echo ""
    echo "옵션:"
    echo "  -t, --topics N      처리할 토픽 수 (기본값: 10)"
    echo "  -s, --skip-audio    오디오 생성 건너뛰기"
    echo "  -v, --verbose       상세 로그 출력"
    echo "  -h, --help          이 도움말 표시"
    echo ""
    echo "예시:"
    echo "  $0                          # 토픽 10개 전체 파이프라인"
    echo "  $0 -t 3                     # 토픽 3개만 처리"
    echo "  $0 -t 5 -s                  # 토픽 5개, 오디오 제외"
    echo "  $0 -v                       # 상세 로그와 함께 실행"
}

# 명령행 인자 처리
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--topics)
            MAX_TOPICS="$2"
            shift 2
            ;;
        -s|--skip-audio)
            SKIP_AUDIO=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "알 수 없는 옵션: $1"
            show_usage
            exit 1
            ;;
    esac
done

# 환경 검증
check_environment() {
    log_info "환경 설정 검증 중..."
    
    # API 키 확인
    if [[ -z "$GOOGLE_AI_API_KEY" ]]; then
        if [[ -f ".env" ]]; then
            source .env
        fi
        
        if [[ -z "$GOOGLE_AI_API_KEY" ]]; then
            log_error "GOOGLE_AI_API_KEY가 설정되지 않았습니다"
            log_info ".env 파일을 확인하거나 환경변수를 설정해주세요"
            exit 1
        fi
    fi
    
    # 필수 도구 확인
    command -v pnpm >/dev/null 2>&1 || { log_error "pnpm이 설치되지 않았습니다"; exit 1; }
    command -v uv >/dev/null 2>&1 || { log_error "uv가 설치되지 않았습니다"; exit 1; }
    
    log_success "환경 설정 검증 완료"
}

# 시작 시간 기록
START_TIME=$(date +%s)

echo "🎬 AI News Cast - 완전 자동화 파이프라인"
echo "=================================================="
echo "📊 설정:"
echo "  • 토픽 수: $MAX_TOPICS"
echo "  • 오디오 생성: $([ "$SKIP_AUDIO" = true ] && echo "건너뛰기" || echo "포함")"
echo "  • 상세 로그: $([ "$VERBOSE" = true ] && echo "활성화" || echo "비활성화")"
echo ""

# 환경 검증
check_environment

# 단계 1: 뉴스 크롤링
log_step "1" "뉴스 데이터 수집 (토픽 $MAX_TOPICS개)"
if pnpm crawl:pipeline -- --max-topics $MAX_TOPICS; then
    log_success "뉴스 크롤링 완료"
    
    # 최신 출력 폴더 확인
    LATEST_OUTPUT=$(ls -t output/ | head -1)
    if [[ -z "$LATEST_OUTPUT" ]]; then
        log_error "출력 폴더를 찾을 수 없습니다"
        exit 1
    fi
    
    OUTPUT_DIR="output/$LATEST_OUTPUT"
    log_info "출력 디렉토리: $OUTPUT_DIR"
    
    # 뉴스 상세 정보 크롤링
    log_info "뉴스 상세 정보 수집 중..."
    cd packages/news-crawler-py
    for i in $(seq -f "%02g" 1 $MAX_TOPICS); do
        if [[ -d "../../$OUTPUT_DIR/topic-$i" ]]; then
            uv run --project . python -m bigkinds_crawler.cli details ../../$OUTPUT_DIR/topic-$i
        fi
    done
    cd ../..
    log_success "뉴스 상세 정보 수집 완료"
else
    log_error "뉴스 크롤링 실패"
    exit 1
fi

# 단계 2: AI 뉴스 통합
log_step "2" "AI 뉴스 통합 정리 (Google Gemini)"
SUCCESS_COUNT=0
for i in $(seq -f "%02g" 1 $MAX_TOPICS); do
    if [[ -d "$OUTPUT_DIR/topic-$i" ]]; then
        log_info "토픽 $i 처리 중..."
        # 절대경로로 직접 실행
        ABS_PATH=$(realpath "$OUTPUT_DIR/topic-$i")
        if timeout 300 bash -c "cd packages/news-processor && GOOGLE_AI_API_KEY=$GOOGLE_AI_API_KEY node dist/cli.js $ABS_PATH"; then
            ((SUCCESS_COUNT++))
            log_success "토픽 $i 완료"
        else
            log_warning "토픽 $i 처리 실패 (타임아웃 또는 오류)"
        fi
    fi
done
log_success "AI 뉴스 통합 완료 ($SUCCESS_COUNT/$MAX_TOPICS 성공)"

# 단계 3: 스크립트 생성
log_step "3" "뉴스캐스트 스크립트 생성 (Google Gemini)"
SCRIPT_COUNT=0
for i in $(seq -f "%02g" 1 $MAX_TOPICS); do
    if [[ -f "$OUTPUT_DIR/topic-$i/news.json" ]]; then
        log_info "토픽 $i 스크립트 생성 중..."
        # 절대경로로 직접 실행
        ABS_PATH=$(realpath "$OUTPUT_DIR/topic-$i")
        if timeout 300 bash -c "cd packages/script-generator && GOOGLE_AI_API_KEY=$GOOGLE_AI_API_KEY node dist/cli.js $ABS_PATH"; then
            ((SCRIPT_COUNT++))
            log_success "토픽 $i 스크립트 완료"
        else
            log_warning "토픽 $i 스크립트 생성 실패 (타임아웃 또는 오류)"
        fi
    fi
done
log_success "스크립트 생성 완료 ($SCRIPT_COUNT/$MAX_TOPICS 성공)"

# 단계 4: 오디오 생성 (선택사항)
if [[ "$SKIP_AUDIO" != true ]]; then
    log_step "4" "TTS 음성 생성 (Google Cloud TTS)"
    AUDIO_COUNT=0
    for i in $(seq -f "%02g" 1 $MAX_TOPICS); do
        if [[ -f "$OUTPUT_DIR/topic-$i/newscast-script.json" ]]; then
            log_info "토픽 $i 오디오 생성 중..."
            if timeout 600 pnpm audio:generate -- ./$OUTPUT_DIR/topic-$i; then
                ((AUDIO_COUNT++))
                log_success "토픽 $i 오디오 완료"
            else
                log_warning "토픽 $i 오디오 생성 실패 (타임아웃 또는 오류)"
            fi
        fi
    done
    log_success "오디오 생성 완료 ($AUDIO_COUNT/$MAX_TOPICS 성공)"
    
    # 단계 5: 오디오 병합
    log_step "5" "최종 오디오 병합 (FFmpeg)"
    MERGE_COUNT=0
    for i in $(seq -f "%02g" 1 $MAX_TOPICS); do
        if [[ -d "$OUTPUT_DIR/topic-$i/audio" ]]; then
            log_info "토픽 $i 오디오 병합 중..."
            if timeout 300 pnpm audio:merge -- ./$OUTPUT_DIR/topic-$i; then
                ((MERGE_COUNT++))
                log_success "토픽 $i 병합 완료"
            else
                log_warning "토픽 $i 오디오 병합 실패 (타임아웃 또는 오류)"
            fi
        fi
    done
    log_success "오디오 병합 완료 ($MERGE_COUNT/$MAX_TOPICS 성공)"
else
    log_info "오디오 생성 건너뛰기 (--skip-audio 옵션)"
fi

# 최종 결과 요약
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "🎉 파이프라인 실행 완료!"
echo "=================================================="
echo "📊 최종 결과:"
echo "  • 크롤링: ✅ 완료"
echo "  • AI 통합: $SUCCESS_COUNT/$MAX_TOPICS 성공"
echo "  • 스크립트: $SCRIPT_COUNT/$MAX_TOPICS 성공"
if [[ "$SKIP_AUDIO" != true ]]; then
    echo "  • 오디오: $AUDIO_COUNT/$MAX_TOPICS 성공"
    echo "  • 병합: $MERGE_COUNT/$MAX_TOPICS 성공"
else
    echo "  • 오디오: 건너뛰기"
fi
echo "  • 총 실행시간: $((DURATION / 60))분 $((DURATION % 60))초"
echo "  • 출력 폴더: $OUTPUT_DIR"
echo ""

# 생성된 파일 목록
echo "📁 생성된 파일:"
find $OUTPUT_DIR -name "*.json" -o -name "*.txt" -o -name "*.mp3" | sort
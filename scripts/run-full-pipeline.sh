#!/bin/bash

# AI News Cast - Full Pipeline Script
# 완전 자동화된 뉴스캐스트 생성 파이프라인

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
    echo -e "\n${CYAN}🚀 STEP: $1${NC}"
    echo "=================================================="
}

# 기본값 설정
MAX_TOPICS=0  # 0 = 모든 토픽 처리
INCLUDE_DETAILS=true
SKIP_AUDIO=false
VERBOSE=false

# 사용법 표시
show_usage() {
    echo "AI News Cast - Full Pipeline Script"
    echo ""
    echo "사용법: $0 [OPTIONS]"
    echo ""
    echo "옵션:"
    echo "  -t, --max-topics NUM     처리할 최대 토픽 수 (기본값: 모든 토픽)"
    echo "  -n, --no-details        뉴스 상세 정보 제외"
    echo "  -s, --skip-audio        오디오 생성 단계 건너뛰기"
    echo "  -v, --verbose           상세 로그 출력"
    echo "  -h, --help              도움말 표시"
    echo ""
    echo "예시:"
    echo "  $0                           # 기본 실행 (모든 토픽)"
    echo "  $0 -t 5 -v                  # 5개 토픽, 상세 로그"
    echo "  $0 -t 1 -s                  # 1개 토픽, 오디오 제외"
    echo "  $0 --no-details --skip-audio # 뉴스 목록만, 오디오 제외"
}

# 명령행 인자 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--max-topics)
            MAX_TOPICS="$2"
            shift 2
            ;;
        -n|--no-details)
            INCLUDE_DETAILS=false
            shift
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
            log_error "알 수 없는 옵션: $1"
            show_usage
            exit 1
            ;;
    esac
done

# 환경 검증 함수
check_environment() {
    log_step "환경 검증"
    
    # 필수 명령어 확인
    local commands=("pnpm" "uv" "node")
    for cmd in "${commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "$cmd 명령어를 찾을 수 없습니다"
            exit 1
        fi
    done
    
    # API 키 확인
    if [ -z "$GOOGLE_AI_API_KEY" ]; then
        log_warning "GOOGLE_AI_API_KEY 환경 변수가 설정되지 않았습니다"
        if [ -f ".env" ]; then
            log_info ".env 파일에서 환경 변수를 로드합니다"
            export $(cat .env | grep -v '^#' | xargs)
        fi
    fi
    
    log_success "환경 검증 완료"
}

# 단계별 실행 함수
run_step() {
    local step_name="$1"
    local command="$2"
    local success_message="$3"
    
    log_step "$step_name"
    
    if [ "$VERBOSE" = true ]; then
        log_info "실행 명령: $command"
    fi
    
    if eval "$command"; then
        log_success "$success_message"
        return 0
    else
        log_error "$step_name 실패 (종료 코드: $?)"
        return 1
    fi
}

# 메인 파이프라인 실행
main() {
    echo "🎬 AI News Cast - Full Pipeline"
    echo "=================================="
    echo "📊 최대 토픽 수: $([ "$MAX_TOPICS" -eq 0 ] && echo "모든 토픽" || echo "$MAX_TOPICS")"
    echo "🔍 상세 정보: $([ "$INCLUDE_DETAILS" = true ] && echo "포함" || echo "제외")"
    echo "🎵 오디오 생성: $([ "$SKIP_AUDIO" = true ] && echo "건너뛰기" || echo "포함")"
    echo "📝 상세 로그: $([ "$VERBOSE" = true ] && echo "활성화" || echo "비활성화")"
    echo ""
    
    # 시작 시간 기록
    local start_time=$(date +%s)
    
    # 환경 검증
    check_environment
    
    # 1단계: 토픽 추출
    if ! run_step "토픽 추출" \
        "pnpm crawl:topics" \
        "토픽 목록 추출 완료"; then
        exit 1
    fi
    
    # 최신 출력 폴더 찾기
    local output_folder=$(ls -1t output/ | head -1)
    local output_path="output/$output_folder"
    
    if [ ! -d "$output_path" ]; then
        log_error "출력 폴더를 찾을 수 없습니다: $output_path"
        exit 1
    fi
    
    log_info "출력 폴더: $output_path"
    
    # 실제 토픽 개수 파악 (MAX_TOPICS=0인 경우 모든 토픽 처리)
    if [ "$MAX_TOPICS" -eq 0 ]; then
        if [ -f "$output_path/topic-list.json" ]; then
            local actual_topics=$(cat "$output_path/topic-list.json" | grep -o '"rank":' | wc -l)
            MAX_TOPICS=$actual_topics
            log_info "모든 토픽 처리 모드: $MAX_TOPICS개 토픽 발견"
        else
            log_warning "토픽 목록 파일을 찾을 수 없어 기본값 10개로 설정합니다"
            MAX_TOPICS=10
        fi
    fi
    
    # 2단계: 뉴스 목록 수집
    if ! run_step "뉴스 목록 수집" \
        "pnpm crawl:news $output_path --topics $(seq -s, 1 $MAX_TOPICS)" \
        "뉴스 목록 수집 완료"; then
        exit 1
    fi
    
    # 3단계: 뉴스 상세 정보 (토픽별 개별 실행)
    if [ "$INCLUDE_DETAILS" = true ]; then
        for i in $(seq 1 $MAX_TOPICS); do
            local topic_folder="$output_path/topic-$(printf "%02d" $i)"
            if [ -d "$topic_folder" ]; then
                if ! run_step "토픽 $i 상세 정보 수집" \
                    "pnpm crawl:details $topic_folder" \
                    "토픽 $i 상세 정보 수집 완료"; then
                    log_warning "토픽 $i 상세 정보 수집 실패, 건너뜁니다"
                fi
            fi
        done
    fi
    
    # 토픽별 처리 루프
    for i in $(seq 1 $MAX_TOPICS); do
        local topic_folder="$output_path/topic-$(printf "%02d" $i)"
        
        if [ ! -d "$topic_folder" ]; then
            log_warning "토픽 폴더를 찾을 수 없습니다: $topic_folder"
            continue
        fi
        
        echo ""
        log_info "토픽 $i 처리 중: $topic_folder"
        
        # 4단계: AI 뉴스 통합
        local abs_topic_folder="$(realpath $topic_folder)"
        if ! run_step "토픽 $i - AI 뉴스 통합" \
            "pnpm news:process $abs_topic_folder" \
            "토픽 $i AI 통합 완료"; then
            log_warning "토픽 $i AI 통합 실패, 다음 토픽으로 건너뜁니다"
            continue
        fi
        
        # 5단계: 스크립트 생성
        local news_json_file="$abs_topic_folder/news.json"
        if [ -f "$news_json_file" ]; then
            if ! run_step "토픽 $i - 뉴스캐스트 스크립트 생성" \
                "pnpm script:generate $news_json_file -o $abs_topic_folder" \
                "토픽 $i 스크립트 생성 완료"; then
                log_warning "토픽 $i 스크립트 생성 실패, 다음 토픽으로 건너뜁니다"
                continue
            fi
        else
            log_warning "토픽 $i news.json 파일을 찾을 수 없습니다: $news_json_file"
            continue
        fi
        
        # 오디오 생성 (옵션)
        if [ "$SKIP_AUDIO" = false ]; then
            local script_json_file="$abs_topic_folder/newscast-script.json"
            local audio_output_dir="$abs_topic_folder"
            
            # 오디오 출력 디렉토리 생성 (audio 하위 폴더는 자동 생성됨)
            mkdir -p "$abs_topic_folder/audio"
            
            if [ -f "$script_json_file" ]; then
                # 6단계: TTS 오디오 생성
                if ! run_step "토픽 $i - TTS 오디오 생성" \
                    "pnpm audio:generate $script_json_file $audio_output_dir" \
                    "토픽 $i TTS 생성 완료"; then
                    log_warning "토픽 $i TTS 생성 실패, 다음 토픽으로 건너뜁니다"
                    continue
                fi
                
                # 7단계: 오디오 병합
                if ! run_step "토픽 $i - 오디오 병합" \
                    "pnpm audio:merge $abs_topic_folder" \
                    "토픽 $i 오디오 병합 완료"; then
                    log_warning "토픽 $i 오디오 병합 실패, 다음 토픽으로 건너뜁니다"
                    continue
                fi
            else
                log_warning "토픽 $i newscast-script.json 파일을 찾을 수 없습니다: $script_json_file"
                continue
            fi
        fi
        
        log_success "토픽 $i 완전 처리 완료!"
    done
    
    # 완료 시간 계산
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    echo ""
    echo "🎉 전체 파이프라인 완료!"
    echo "=================================================="
    echo "📁 출력 폴더: $output_path"
    echo "📊 처리된 토픽 수: $MAX_TOPICS"
    echo "⏱️  총 실행 시간: ${minutes}분 ${seconds}초"
    echo "🎵 오디오 파일: $([ "$SKIP_AUDIO" = true ] && echo "생성 안함" || echo "생성 완료")"
    echo ""
    
    # 결과 파일 목록
    log_info "생성된 파일들:"
    for i in $(seq 1 $MAX_TOPICS); do
        local topic_folder="$output_path/topic-$(printf "%02d" $i)"
        if [ -d "$topic_folder" ]; then
            echo "  📂 토픽 $i:"
            [ -f "$topic_folder/news.txt" ] && echo "    📰 $topic_folder/news.txt"
            [ -f "$topic_folder/newscast-script.txt" ] && echo "    📝 $topic_folder/newscast-script.txt"
            if [ "$SKIP_AUDIO" = false ]; then
                local audio_file=$(find "$topic_folder" -name "newscast-*.mp3" 2>/dev/null | head -1)
                [ -n "$audio_file" ] && echo "    🎵 $audio_file"
            fi
        fi
    done
}

# 스크립트 실행
main "$@"
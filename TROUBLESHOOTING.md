# 트러블슈팅 가이드

> v3.1.0 크롤링 파이프라인 완성 버전 기준 문제 해결 가이드

## 🚨 자주 발생하는 문제들

### 1. 환경 설정 문제

#### UV 설치 오류
```bash
# 문제: uv: command not found
# 해결:
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# 확인:
which uv  # /home/user/.local/bin/uv 출력되어야 함
```

#### Node.js 버전 문제
```bash
# 문제: Node.js 24+ 필요
# 확인:
node --version  # v24.0.0+ 필요

# 해결 (Ubuntu/Debian):
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs

# 해결 (macOS):
brew install node@24
```

#### pnpm 설치 문제
```bash
# 문제: pnpm: command not found
# 해결:
npm install -g pnpm@10.12.2

# 확인:
pnpm --version  # 10.12.2 출력되어야 함
```

### 2. 크롤링 실행 문제

#### 의존성 설치 오류
```bash
# 문제: packages/news-crawler에서 의존성 오류
# 해결:
cd packages/news-crawler
uv venv
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate     # Windows
uv pip install -r requirements.txt

# 확인:
uv pip list | grep requests  # requests 라이브러리 확인
```

#### 크롤링 실행 권한 오류
```bash
# 문제: ./scripts/run-all.sh permission denied
# 해결:
chmod +x scripts/run-all.sh

# 실행:
./scripts/run-all.sh
```

#### BigKinds 접속 오류
```bash
# 문제: requests.exceptions.ConnectionError
# 원인: 네트워크 연결 또는 BigKinds 서버 문제
# 해결:
1. 인터넷 연결 확인
2. https://bigkinds.or.kr 직접 접속 테스트
3. 방화벽/프록시 설정 확인
4. 잠시 후 재시도 (서버 일시적 문제 가능성)
```

### 3. JSON 출력 문제

#### jq 설치 오류
```bash
# 문제: jq: command not found
# 해결 (Ubuntu/Debian):
sudo apt install jq

# 해결 (macOS):
brew install jq

# 해결 (Windows):
winget install jqlang.jq

# 확인:
echo '{"test": 123}' | jq .  # JSON 파싱 테스트
```

#### JSON 파싱 오류
```bash
# 문제: parse error: Invalid numeric literal
# 원인: Turbo 출력과 JSON 혼재
# 해결: --print-log-file 옵션 사용
pnpm crawl:news-topics -- --output-file "output/test.json" --print-log-file "output/log.json"

# JSON만 추출:
jq . output/log.json
```

### 4. 파이프라인 실행 문제

#### Turbo 명령어 오류
```bash
# 문제: turbo: Task "crawl:news-topics" not found
# 원인: 루트 디렉토리에서 실행하지 않음
# 해결:
cd /path/to/ai-newscast  # 프로젝트 루트로 이동
pnpm crawl:news-topics   # 다시 실행
```

#### 토픽 개수 불일치
```bash
# 문제: 30개 토픽 보고되지만 실제로는 10개만 추출
# 원인: BigKinds UI에서 3개 섹션에 동일 토픽 표시
# 정상 동작: 중복 제거 알고리즘이 올바르게 작동 중
# 확인:
jq '.["total-topics"]' output/latest/topic-list.json  # 10 출력 정상
```

#### 출력 폴더 생성 오류
```bash
# 문제: mkdir: cannot create directory 'output'
# 해결:
mkdir -p output
chmod 755 output

# 또는 전체 경로 생성:
mkdir -p output/$(date +%Y-%m-%dT%H-%M-%S)
```

### 5. 성능 및 최적화 문제

#### 메모리 부족
```bash
# 문제: 대량 뉴스 크롤링 시 메모리 부족
# 해결:
# 1. 토픽 개수 제한
pnpm crawl:news-list -- --input-file topic-list.json --topic-index 0  # 단일 토픽만

# 2. Python 메모리 최적화
export PYTHONOPTIMIZE=1
ulimit -m 2097152  # 2GB 메모리 제한
```

#### 크롤링 속도 개선
```bash
# 현재 성능 지표 (v3.1.0):
- 토픽 추출: 0.38초 (10개)
- 뉴스 리스트: 토픽당 ~15초 (100개)
- 뉴스 상세: 토픽당 ~2-3분 (전체 내용)

# 속도 개선 방법:
1. 단일 토픽 테스트: --topic-index 0
2. 네트워크 안정성 확인
3. BigKinds 서버 응답 시간에 의존적
```

### 6. 디버깅 방법

#### 상세 로그 활성화
```bash
# Python 크롤러 디버그 모드:
cd packages/news-crawler
python news_crawler.py news-topics --output-file "debug.json" --print-format text

# 단계별 실행으로 문제 격리:
pnpm crawl:news-topics    # 1단계만
pnpm crawl:news-list      # 2단계만  
pnpm crawl:news-details   # 3단계만
```

#### 임시 파일 확인
```bash
# 임시 파일 위치 확인:
ls -la /tmp/tmp.*         # mktemp로 생성된 파일들
cat /tmp/tmp.*/log.json   # 실제 로그 내용 확인
```

#### 네트워크 연결 테스트
```bash
# BigKinds 연결 테스트:
curl -I https://bigkinds.or.kr
curl -X POST https://bigkinds.or.kr/news/getNetworkDataAnalysis.do \
  -H "Content-Type: application/json" \
  -d '{"searchStr":"테스트"}'
```

## 🔧 일반적인 해결 절차

### 1단계: 환경 확인
```bash
# 기본 환경 체크리스트:
node --version    # v24.0.0+
pnpm --version    # 10.12.2
uv --version      # 최신 버전
jq --version      # 1.6+
which python      # Python 3.11+
```

### 2단계: 의존성 재설치
```bash
# 전체 재설치:
rm -rf node_modules pnpm-lock.yaml
cd packages/news-crawler && rm -rf .venv uv.lock
pnpm install
cd packages/news-crawler && uv venv && uv pip install -r requirements.txt
```

### 3단계: 단계별 테스트
```bash
# 최소 기능 테스트:
pnpm crawl:news-topics -- --output-file "test-topics.json" --print-format json
jq . test-topics.json  # JSON 파싱 테스트
```

### 4단계: 로그 분석
```bash
# 상세 로그 수집:
./scripts/run-all.sh > pipeline.log 2>&1
grep -E "(ERROR|Exception|Failed)" pipeline.log
```

## 📞 추가 도움말

### 공식 문서
- [UV 문서](https://docs.astral.sh/uv/)
- [BigKinds 공식 사이트](https://bigkinds.or.kr)
- [Turbo 문서](https://turbo.build/)

### 문제 보고
GitHub Issues에 다음 정보와 함께 보고:
1. 운영체제 및 버전
2. Node.js, Python, UV 버전
3. 실행한 명령어
4. 전체 에러 메시지
5. 로그 파일 (개인정보 제거 후)

---

**최종 업데이트**: v3.1.0 (2025-06-27)
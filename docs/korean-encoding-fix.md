# 한국어 텍스트 인코딩 문제 분석 및 해결 방법

## 문제 설명
빅카인드 추출 스크립트에서 "ì´ì¬ëª"와 같은 깨진 한국어 텍스트가 "이재명"와 같은 올바른 한국어 문자 대신 생성되는 문제가 발생했습니다.

## 근본 원인 분석
문제는 lxml에서 HTML 콘텐츠를 파싱하는 방식에 있었습니다. `etree.HTML(response.content)`와 같이 raw bytes를 사용할 때, lxml이 한국어 문자의 UTF-8 인코딩을 제대로 처리하지 못했습니다.

### 기술적 세부사항
1. **response.content의 raw bytes**: `b'\xec\x9d\xb4\xec\x9e\xac\xeb\xaa\x85'` (UTF-8로 인코딩된 한국어)
2. **`etree.HTML(response.content)`로 파싱할 때**: 깨진 텍스트 "ì´ì¬ëª" 생성
3. **`etree.HTML(response.text)`로 파싱할 때**: 올바른 텍스트 "이재명" 생성

차이점은 `response.text`는 이미 유니코드 문자열로 디코딩되어 있는 반면, `response.content`는 적절한 인코딩 처리가 필요한 raw bytes를 포함한다는 것입니다.

## 구현된 해결책

### 1. HTML 파싱 수정
**이전:**
```python
root = etree.HTML(response.content)  # ❌ 인코딩 문제 발생
```

**수정 후:**
```python
root = etree.HTML(response.text)  # ✅ 적절한 유니코드 처리
```

### 2. HTML 엔티티 디코딩 추가
**이전:**
```python
topic_text = button.get("data-topic", "")  # ❌ &#039;를 그대로 둠
```

**수정 후:**
```python
topic_text = html.unescape(button.get("data-topic", ""))  # ✅ &#039;를 '로 변환
```

### 3. 모든 텍스트 필드에 적용
다음 필드들에 수정사항이 적용되었습니다:
- `topic_text` (주요 주제 제목)
- `issue_name` (키워드 문자열)
- `summary` (상세 요약 텍스트)

## 테스트 결과

### 수정 전:
```
1. ì´ì¬ëª ëíµë ¹, íµì¼ë¶ ë± 5ê° ë¶ì² ì°¨ê´ê¸ ì¸ì¬ ë¨í
2. êµ­ì ì, &#039;ê³µì½ ì´í ê³í ë¶ì¤&#039;&#039; æª¢ ìë¬´ë³´ê³  ì¤ë¨
```

### 수정 후:
```
1. 이재명 대통령, 통일부 등 5개 부처 차관급 인사 단행
2. 국정위, '공약 이행 계획 부실'' 檢 업무보고 중단
```

## 주요 교훈

1. **비 ASCII 문자를 다룰 때는 항상 `response.text` 사용** - HTML 파싱에 적합
2. **HTML 엔티티 디코딩 추가** - `&#039;` 같은 HTML 엔티티 정리
3. **실제 한국어 콘텐츠로 테스트** - 인코딩이 올바르게 작동하는지 확인
4. **응답 인코딩 감지** - (`response.encoding = 'utf-8'`)는 이미 올바르게 설정되어 있었지만, 파싱 방법이 문제였음

## 코드 변경 요약

### 수정된 파일들:
- `packages/news-crawler-py/src/bigkinds_crawler/parsers.py` (v2.0 모노레포)
- ~~`/mnt/d/Projects/ai-newscast/tests/claude-code/bigkinds_topic_list.py`~~ (레거시)

### 주요 변경사항:
1. HTML 엔티티 디코딩을 위한 `import html` 추가
2. `etree.HTML(response.content)`를 `etree.HTML(response.text)`로 변경
3. 모든 텍스트 추출에 `html.unescape()` 호출 추가
4. 설명 주석 추가

## v2.0 모노레포에서의 적용

현재 v2.0 모노레포 아키텍처에서는 이 수정사항이 다음 위치에 적용되어 있습니다:

```python
# packages/news-crawler-py/src/bigkinds_crawler/parsers.py
import html
from lxml import etree

def parse_topics(response_text: str) -> List[Topic]:
    """HTML 응답에서 주제 목록을 파싱합니다."""
    root = etree.HTML(response_text)  # ✅ Unicode 문자열 사용
    
    for button in root.xpath('//a[@class="issupop-btn"]'):
        topic_text = html.unescape(button.get("data-topic", ""))  # ✅ HTML 엔티티 디코딩
        # ... 추가 처리
```

이 수정사항은 전체 데이터 처리 파이프라인을 통해 한국어 텍스트가 올바르게 추출되고 보존되도록 보장합니다.

## 모범 사례

### Python 크롤러 개발 시 권장사항:
1. **항상 `response.text` 사용** - 웹 스크래핑에서 HTML 파싱 시
2. **HTML 엔티티 처리** - `html.unescape()` 적극 활용
3. **인코딩 테스트** - 실제 한국어 데이터로 검증
4. **로깅 추가** - 인코딩 문제 디버깅을 위한 상세 로그

### TypeScript/JavaScript에서:
```typescript
// 브라우저 환경에서는 자동으로 UTF-8 처리됨
const text = await response.text();
const decodedText = new DOMParser()
  .parseFromString(`<!doctype html><body>${text}`, 'text/html')
  .body.textContent;
```

---
*이 문서는 v0.2.1 (2025-06-20)에서 발견된 한국어 인코딩 문제의 분석 및 해결 과정을 기록한 것입니다.*  
*v2.0.0 모노레포 아키텍처에서는 이 수정사항이 `packages/news-crawler-py/`에 적용되어 있습니다.*
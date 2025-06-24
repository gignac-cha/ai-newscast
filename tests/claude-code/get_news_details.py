import json
import os
import requests
import urllib3
from datetime import datetime
import sys

urllib3.disable_warnings()

def get_news_detail(news_id, topic_folder_path):
    """개별 뉴스의 상세 정보를 가져옵니다."""
    url = "https://bigkinds.or.kr/news/detailView.do"
    
    headers = {
        "Referer": "https://www.bigkinds.or.kr/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    }
    
    params = {
        "docId": news_id,
        "returnCnt": 1,
        "sectionDiv": 1000,
    }
    
    response = requests.get(url, headers=headers, params=params, verify=False)
    response.raise_for_status()
    
    # 응답 데이터 저장
    response_data = response.json()
    
    
    return response_data

def save_news_detail(news_detail_data, topic_folder_path, news_id):
    """뉴스 상세 데이터를 JSON 파일로 저장합니다."""
    # news 서브폴더 생성
    news_folder_path = os.path.join(topic_folder_path, "news")
    os.makedirs(news_folder_path, exist_ok=True)
    
    json_path = os.path.join(news_folder_path, f"{news_id}.json")
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(news_detail_data, f, ensure_ascii=False, indent=2)
    
    return json_path

def load_news_list(topic_folder_path):
    """해당 주제의 뉴스 목록을 로드합니다."""
    news_list_path = os.path.join(topic_folder_path, "news-list.json")
    
    if not os.path.exists(news_list_path):
        print(f"뉴스 목록 파일을 찾을 수 없습니다: {news_list_path}")
        return None
    
    with open(news_list_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def extract_news_content(news_detail_data):
    """뉴스 상세 응답에서 유용한 정보를 추출합니다."""
    extracted = {
        "extraction_timestamp": datetime.now().isoformat(),
        "news_detail": None,
        "content": None,
        "metadata": {}
    }
    
    if "detail" in news_detail_data:
        detail = news_detail_data["detail"]
        extracted["news_detail"] = detail
        
        # 주요 필드 추출
        extracted["content"] = detail.get("CONTENT", "")
        extracted["metadata"] = {
            "title": detail.get("TITLE", ""),
            "provider": detail.get("PROVIDER_NAME", ""),
            "byline": detail.get("BYLINE", ""),
            "published_date": detail.get("PUBLISHED_DATE", ""),
            "category": detail.get("CATEGORY", ""),
            "keywords": detail.get("KEYWORDS", ""),
            "summary": detail.get("SUMMARY", ""),
            "url": detail.get("URL", "")
        }
    
    return extracted

def process_full_pipeline():
    """전체 파이프라인을 실행합니다: 주제 추출 → 뉴스 목록 → 뉴스 상세"""
    import time
    total_start_time = time.time()
    
    print("🚀 빅카인드 뉴스 전체 파이프라인 시작")
    print("=" * 50)
    
    # 1단계: 주제 목록 추출
    print("📋 1단계: 주제 목록 추출 중...")
    step1_start = time.time()
    os.system("python bigkinds_topic_list.py")
    step1_time = time.time() - step1_start
    
    # 최신 폴더 찾기
    bigkinds_base_dir = 'bigkinds'
    if not os.path.exists(bigkinds_base_dir):
        print("❌ bigkinds 폴더가 없습니다.")
        return None
    
    bigkinds_folders = [d for d in os.listdir(bigkinds_base_dir) if os.path.isdir(os.path.join(bigkinds_base_dir, d))]
    if not bigkinds_folders:
        print("❌ 주제 목록이 추출되지 않았습니다.")
        return None
    
    latest_folder = os.path.join(bigkinds_base_dir, sorted(bigkinds_folders)[-1])
    print(f"✅ 주제 목록 추출 완료: {latest_folder}")
    print(f"   ⏱️  1단계 소요 시간: {step1_time:.3f}초")
    
    # 2단계: 모든 주제의 뉴스 목록 추출 (10개 전체)
    print("\n📰 2단계: 모든 주제의 뉴스 목록 추출 중...")
    step2_start = time.time()
    for i in range(1, 11):  # 1~10 주제
        print(f"  📄 {i}순위 주제 뉴스 목록 추출 중...")
        os.system(f"python get_news_list.py {latest_folder} {i}")
    step2_time = time.time() - step2_start
    
    print("✅ 모든 주제의 뉴스 목록 추출 완료")
    print(f"   ⏱️  2단계 소요 시간: {step2_time:.3f}초")
    
    # 3단계: 첫 번째 주제의 뉴스 상세 정보 추출
    print("\n🔍 3단계: 첫 번째 주제의 뉴스 상세 정보 추출 중...")
    step3_start = time.time()
    topic_01_folder = os.path.join(latest_folder, "topic-01")
    
    if not os.path.exists(topic_01_folder):
        print(f"❌ topic-01 폴더를 찾을 수 없습니다: {topic_01_folder}")
        return None
    
    # 뉴스 목록 로드
    news_list_data = load_news_list(topic_01_folder)
    if not news_list_data:
        return None
    
    news_list = news_list_data["news_list"]
    topic_title = news_list_data["topic"]
    
    print(f"  📋 주제: {topic_title}")
    print(f"  📊 총 뉴스 개수: {len(news_list)}개")
    
    # 각 뉴스의 상세 정보 추출
    success_count = 0
    error_count = 0
    news_extraction_times = []
    
    for i, news_item in enumerate(news_list):
        news_start_time = time.time()
        news_id = news_item["news_id"]
        news_title = news_item["title"]
        # 뉴스 ID 형식 변환: 하이픈을 점으로 변경
        api_news_id = news_id.replace('-', '.')
        
        try:
            print(f"    🔍 [{i+1}/{len(news_list)}] {news_id[:15]}... 추출 중")
            
            # 뉴스 상세 정보 가져오기 (API용 ID 사용)
            news_detail_data = get_news_detail(api_news_id, topic_01_folder)
            
            # 데이터 추출 및 저장
            extracted_data = extract_news_content(news_detail_data)
            json_path = save_news_detail(extracted_data, topic_01_folder, news_id)
            
            news_time = time.time() - news_start_time
            news_extraction_times.append(news_time)
            success_count += 1
            
        except Exception as e:
            print(f"    ❌ 오류 발생 ({news_id}): {e}")
            error_count += 1
    
    step3_time = time.time() - step3_start
    total_time = time.time() - total_start_time
    
    print(f"\n✅ 뉴스 상세 정보 추출 완료!")
    print(f"  📊 성공: {success_count}개")
    print(f"  ❌ 실패: {error_count}개")
    print(f"  📁 저장 위치: {topic_01_folder}/news/")
    print(f"   ⏱️  3단계 소요 시간: {step3_time:.3f}초")
    
    if news_extraction_times:
        avg_time = sum(news_extraction_times) / len(news_extraction_times)
        max_time = max(news_extraction_times)
        min_time = min(news_extraction_times)
        print(f"   📋 개별 뉴스 처리 시간: 평균 {avg_time:.3f}초, 최대 {max_time:.3f}초, 최소 {min_time:.3f}초")
    
    print(f"\n⏱️  전체 파이프라인 실행 시간 분석:")
    print(f"  📋 1단계 (주제 목록): {step1_time:.3f}초")
    print(f"  📰 2단계 (뉴스 목록): {step2_time:.3f}초")
    print(f"  🔍 3단계 (뉴스 상세): {step3_time:.3f}초")
    print(f"  🚀 전체 시간: {total_time:.3f}초")
    
    return latest_folder

def process_single_topic(folder_path, topic_rank):
    """특정 주제의 뉴스 상세 정보만 추출합니다."""
    import time
    start_time = time.time()
    
    topic_folder_path = os.path.join(folder_path, f"topic-{topic_rank:02d}")
    
    if not os.path.exists(topic_folder_path):
        print(f"❌ 주제 폴더를 찾을 수 없습니다: {topic_folder_path}")
        return
    
    # 뉴스 목록 로드
    news_list_data = load_news_list(topic_folder_path)
    if not news_list_data:
        return
    
    news_list = news_list_data["news_list"]
    topic_title = news_list_data["topic"]
    
    print(f"🔍 주제: {topic_title}")
    print(f"📊 총 뉴스 개수: {len(news_list)}개")
    
    # 각 뉴스의 상세 정보 추출
    success_count = 0
    error_count = 0
    news_extraction_times = []
    
    for i, news_item in enumerate(news_list):
        news_start_time = time.time()
        news_id = news_item["news_id"]
        # 뉴스 ID 형식 변환: 하이픈을 점으로 변경
        api_news_id = news_id.replace('-', '.')
        
        try:
            print(f"  🔍 [{i+1}/{len(news_list)}] {news_id} 추출 중...")
            
            # 뉴스 상세 정보 가져오기 (API용 ID 사용)
            news_detail_data = get_news_detail(api_news_id, topic_folder_path)
            
            # 데이터 추출 및 저장
            extracted_data = extract_news_content(news_detail_data)
            json_path = save_news_detail(extracted_data, topic_folder_path, news_id)
            
            news_time = time.time() - news_start_time
            news_extraction_times.append(news_time)
            success_count += 1
            
        except Exception as e:
            print(f"    ❌ 오류 발생 ({news_id}): {e}")
            error_count += 1
    
    total_time = time.time() - start_time
    
    print(f"\n✅ 뉴스 상세 정보 추출 완료!")
    print(f"  📊 성공: {success_count}개")
    print(f"  ❌ 실패: {error_count}개")
    print(f"   ⏱️  총 소요 시간: {total_time:.3f}초")
    
    if news_extraction_times:
        avg_time = sum(news_extraction_times) / len(news_extraction_times)
        max_time = max(news_extraction_times)
        min_time = min(news_extraction_times)
        print(f"   📋 개별 뉴스 처리 시간: 평균 {avg_time:.3f}초, 최대 {max_time:.3f}초, 최소 {min_time:.3f}초")

def main():
    if len(sys.argv) == 1:
        # 전체 파이프라인 실행
        process_full_pipeline()
    elif len(sys.argv) == 3:
        # 특정 주제의 뉴스 상세 정보만 추출
        folder_path = sys.argv[1]
        topic_rank = int(sys.argv[2])
        process_single_topic(folder_path, topic_rank)
    else:
        print("사용법:")
        print("  python get_news_details.py                    # 전체 파이프라인 실행")
        print("  python get_news_details.py <folder> <topic>   # 특정 주제만 처리")
        print("")
        print("예시:")
        print("  python get_news_details.py                           # 전체 실행")
        print("  python get_news_details.py bigkinds-2025-06-20... 1  # 1순위 주제만")

if __name__ == "__main__":
    main()
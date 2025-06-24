import json
import os
import requests
import urllib3
from datetime import datetime, timedelta
import sys

urllib3.disable_warnings()

def get_news_list(topic, news_ids_str, topic_folder_path):
    """특정 주제에 대한 뉴스 목록을 가져옵니다."""
    url = "https://bigkinds.or.kr/news/getNetworkDataAnalysis.do"
    
    headers = {
        "Referer": "https://www.bigkinds.or.kr/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest"
    }
    
    # 날짜 설정 (어제부터 오늘까지)
    today = datetime.now()
    start_date = (today - timedelta(days=1)).strftime("%Y-%m-%d")
    end_date = today.strftime("%Y-%m-%d")
    
    data = {
        "pageInfo": "newsResult",
        "keyword": topic,
        "startDate": start_date,
        "endDate": end_date,
        "newsCluster": news_ids_str,
        "resultNo": "100",
    }
    
    response = requests.post(url, headers=headers, data=data, verify=False)
    response.raise_for_status()
    
    # 응답 데이터 저장
    response_data = response.json()
    
    
    return response_data

def extract_news_data(response_data, topic):
    """응답 데이터에서 뉴스 정보를 추출합니다."""
    extracted_data = {
        "topic": topic,
        "extraction_timestamp": datetime.now().isoformat(),
        "total_news": 0,
        "news_list": []
    }
    
    if "newsList" in response_data:
        news_list = response_data["newsList"]
        extracted_data["total_news"] = len(news_list)
        
        for news_item in news_list:
            news_data = {
                "news_id": news_item.get("news_node_id", ""),
                "title": news_item.get("title", ""),
                "provider_name": news_item.get("provider_name", ""),
                "byline": news_item.get("byline", ""),
                "published_date": news_item.get("published_date", ""),
                "summary": news_item.get("summary", ""),
                "keywords": [kw.get("label", "") for kw in news_item.get("inKeyword", [])],
                "category": news_item.get("category", ""),
                "url": news_item.get("url", "")
            }
            extracted_data["news_list"].append(news_data)
    
    # newsIds가 있다면 추가
    if "newsIds" in response_data:
        extracted_data["news_ids"] = response_data["newsIds"]
    
    return extracted_data

def load_topic_data(folder_path):
    """기존에 추출된 주제 데이터를 로드합니다."""
    json_path = os.path.join(folder_path, "topic-list.json")
    
    if not os.path.exists(json_path):
        print(f"주제 데이터 파일을 찾을 수 없습니다: {json_path}")
        return None
    
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_news_data(news_data, topic_folder_path):
    """뉴스 데이터를 JSON 파일로 저장합니다."""
    json_path = os.path.join(topic_folder_path, "news-list.json")
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(news_data, f, ensure_ascii=False, indent=2)
    
    return json_path

def main():
    if len(sys.argv) < 2:
        print("사용법: python get_news_list.py <bigkinds_folder_path> [topic_rank]")
        print("예시: python get_news_list.py bigkinds-2025-06-20T22:00:54.999029")
        print("예시: python get_news_list.py bigkinds-2025-06-20T22:00:54.999029 1")
        return
    
    folder_path = sys.argv[1]
    specific_rank = int(sys.argv[2]) if len(sys.argv) > 2 else None
    
    if not os.path.exists(folder_path):
        print(f"폴더를 찾을 수 없습니다: {folder_path}")
        return
    
    # 주제 데이터 로드
    topic_data = load_topic_data(folder_path)
    if not topic_data:
        return
    
    topics = topic_data["topics"]
    
    # 특정 순위만 처리하거나 모든 주제 처리
    topics_to_process = []
    if specific_rank:
        topic_found = None
        for topic in topics:
            if topic["rank"] == specific_rank:
                topic_found = topic
                break
        if topic_found:
            topics_to_process = [topic_found]
        else:
            print(f"순위 {specific_rank}에 해당하는 주제를 찾을 수 없습니다.")
            return
    else:
        topics_to_process = topics[:3]  # 상위 3개만 처리
    
    import time
    total_start_time = time.time()
    
    print(f"총 {len(topics_to_process)}개 주제의 뉴스 목록을 가져옵니다...")
    
    for topic_info in topics_to_process:
        topic_start_time = time.time()
        rank = topic_info["rank"]
        topic = topic_info["topic"]
        news_ids_str = ",".join(topic_info["news_ids"])
        
        print(f"\n[{rank}] {topic}")
        print(f"뉴스 ID 개수: {len(topic_info['news_ids'])}개")
        
        try:
            # 주제별 폴더 생성
            folder_creation_start = time.time()
            topic_folder_path = os.path.join(folder_path, f"topic-{rank:02d}")
            os.makedirs(topic_folder_path, exist_ok=True)
            folder_creation_time = time.time() - folder_creation_start
            
            # 뉴스 목록 가져오기
            api_start = time.time()
            response_data = get_news_list(topic, news_ids_str, topic_folder_path)
            api_time = time.time() - api_start
            
            # 데이터 추출
            extraction_start = time.time()
            news_data = extract_news_data(response_data, topic)
            extraction_time = time.time() - extraction_start
            
            # JSON으로 저장
            save_start = time.time()
            json_path = save_news_data(news_data, topic_folder_path)
            save_time = time.time() - save_start
            
            topic_total_time = time.time() - topic_start_time
            
            print(f"✅ 뉴스 {news_data['total_news']}개를 {topic_folder_path}/ 폴더에 저장했습니다.")
            print(f"   📁 {topic_folder_path}/news-list.json")
            print(f"   ⏱️  처리 시간: {topic_total_time:.3f}초 (API: {api_time:.3f}초, 추출: {extraction_time:.3f}초, 저장: {save_time:.3f}초)")
            
            # 처음 몇 개 뉴스 미리보기
            for i, news in enumerate(news_data["news_list"][:3]):
                print(f"   {i+1}. {news['title'][:50]}...")
                print(f"      📰 {news['provider_name']} | {news['byline']}")
        
        except Exception as e:
            print(f"❌ 오류 발생: {e}")
    
    total_time = time.time() - total_start_time
    print(f"\n⏱️  전체 뉴스 목록 추출 완료 시간: {total_time:.3f}초")

if __name__ == "__main__":
    main()
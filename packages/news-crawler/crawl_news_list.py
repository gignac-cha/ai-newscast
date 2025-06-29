import json
import requests
import urllib.parse
import os
from datetime import datetime, timedelta

def crawl_news_list(input_file, topic_index, output_file=None, output_manager=None):
    """특정 주제에 대한 뉴스 목록을 가져옵니다."""
    if output_manager:
        output_manager.info(f"Crawling news list for topic {topic_index}...")
    
    # 주제 데이터 로드
    if not os.path.exists(input_file):
        if output_manager:
            output_manager.info(f"Input file not found: {input_file}")
        return None
    
    with open(input_file, 'r', encoding='utf-8') as f:
        topics = json.load(f)
    
    # 해당 순위의 주제 찾기
    topic_data = None
    for topic in topics:
        if topic.get("rank") == topic_index + 1:  # 0-based index to 1-based rank
            topic_data = topic
            break
    
    if not topic_data:
        if output_manager:
            output_manager.info(f"Topic with index {topic_index} not found")
        return None
    
    topic_title = topic_data["title"]
    news_ids_list = topic_data["news_ids"]
    news_ids_str = ",".join(news_ids_list)
    
    if output_manager:
        output_manager.info(f"Topic: {topic_title}")
        output_manager.info(f"News IDs count: {len(news_ids_list)}")
    
    # API 호출
    scheme = "https"
    netloc = "bigkinds.or.kr"
    path = "/news/getNetworkDataAnalysis.do"
    params = ''
    queries = {}
    query = urllib.parse.urlencode(queries)
    fragment = ''
    url = urllib.parse.urlunparse((scheme, netloc, path, params, query, fragment))
    
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
        "keyword": topic_title,
        "startDate": start_date,
        "endDate": end_date,
        "newsCluster": news_ids_str,
        "resultNo": "100",
    }
    
    try:
        response = requests.post(url, headers=headers, data=data, verify=False, timeout=30)
        response.raise_for_status()
        response_data = response.json()
    except requests.exceptions.RequestException as e:
        if output_manager:
            output_manager.info(f"Error fetching news list: {e}")
        return None
    
    # 데이터 추출
    extracted_data = {
        "topic": topic_title,
        "topic_index": topic_index,
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
    
    if output_manager:
        output_manager.info(f"Extracted {extracted_data['total_news']} news items")
    return extracted_data
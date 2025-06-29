import json
import requests
import urllib.parse
import os
from datetime import datetime

def crawl_news_details(input_file, output_folder=None, output_manager=None):
    """뉴스 목록에서 각 뉴스의 상세 정보를 가져옵니다."""
    if output_manager:
        output_manager.info("Crawling news details...")
    
    # 뉴스 목록 데이터 로드
    if not os.path.exists(input_file):
        if output_manager:
            output_manager.info(f"Input file not found: {input_file}")
        return None
    
    with open(input_file, 'r', encoding='utf-8') as f:
        news_list_data = json.load(f)
    
    news_list = news_list_data.get("news_list", [])
    if not news_list:
        if output_manager:
            output_manager.info("No news list found in input file")
        return None
    
    if output_manager:
        output_manager.info(f"Processing {len(news_list)} news items...")
    
    # news 서브폴더 생성
    if output_folder:
        os.makedirs(output_folder, exist_ok=True)
    
    success_count = 0
    error_count = 0
    extracted_files = []
    
    headers = {
        "Referer": "https://www.bigkinds.or.kr/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    }
    
    for i, news_item in enumerate(news_list):
        news_id = news_item["news_id"]
        # 뉴스 ID 형식 변환: 하이픈을 점으로 변경 (API 호출용)
        api_news_id = news_id.replace('-', '.')
        
        try:
            if output_manager:
                output_manager.info(f"  [{i+1}/{len(news_list)}] {news_id} 추출 중...")
            
            # API 호출
            scheme = "https"
            netloc = "bigkinds.or.kr"
            path = "/news/detailView.do"
            params = ''
            queries = {
                "docId": api_news_id,
                "returnCnt": 1,
                "sectionDiv": 1000,
            }
            query = urllib.parse.urlencode(queries)
            fragment = ''
            url = urllib.parse.urlunparse((scheme, netloc, path, params, query, fragment))
            
            response = requests.get(url, headers=headers, verify=False, timeout=30)
            response.raise_for_status()
            response_data = response.json()
            
            # 데이터 추출
            extracted = {
                "extraction_timestamp": datetime.now().isoformat(),
                "original_news_id": news_id,
                "api_news_id": api_news_id,
                "news_detail": None,
                "content": None,
                "metadata": {}
            }
            
            if "detail" in response_data:
                detail = response_data["detail"]
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
            
            # 파일 저장
            if output_folder:
                json_path = os.path.join(output_folder, f"{news_id}.json")
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(extracted, f, ensure_ascii=False, indent=2)
                extracted_files.append(json_path)
            
            success_count += 1
            
        except Exception as e:
            if output_manager:
                output_manager.info(f"    Error processing {news_id}: {e}")
            error_count += 1
    
    result = {
        "timestamp": datetime.now().isoformat(),
        "total_processed": len(news_list),
        "success_count": success_count,
        "error_count": error_count,
        "output_files": extracted_files
    }
    
    if output_manager:
        output_manager.info(f"Completed: {success_count} success, {error_count} errors")
    return result
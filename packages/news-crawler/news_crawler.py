import json
import time
import requests
import lxml.etree
import urllib.parse
import urllib3
import os
from datetime import datetime, timedelta

urllib3.disable_warnings()

class OutputManager:
    def __init__(self, print_log_format='text', print_log_file=None):
        self.print_log_format = print_log_format
        self.print_log_file = print_log_file
    
    def info(self, message):
        if self.print_log_format != 'json':
            print(message)
    
    def json_output(self, data):
        json_str = json.dumps(data, ensure_ascii=False, indent=2)
        if self.print_log_format == 'json':
            print(json_str)
        
        # Write to log file if specified
        if self.print_log_file:
            os.makedirs(os.path.dirname(self.print_log_file), exist_ok=True)
            with open(self.print_log_file, 'w', encoding='utf-8') as f:
                f.write(json_str)

def crawl_news_topics(output_file=None, output_manager=OutputManager()):
    """뉴스 토픽을 크롤링하고, data-* 속성에서 상세 정보를 추출합니다."""
    output_manager.info("Crawling news topics from BigKinds...")
    
    scheme = "https"
    netloc = "www.bigkinds.or.kr"
    path = '/'
    params = ''
    queries = {}
    query = urllib.parse.urlencode(queries)
    fragment = ''
    url = urllib.parse.urlunparse((scheme, netloc, path, params, query, fragment))

    try:
        response = requests.get(url, verify=False, timeout=10)
        response.raise_for_status()
        response.encoding = response.apparent_encoding
    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL: {e}")
        return []

    html_content = response.content

    if output_file:
        raw_html_path = output_file.replace('.json', '.raw.html')
        os.makedirs(os.path.dirname(raw_html_path), exist_ok=True)
        with open(raw_html_path, "wb") as f:
            f.write(html_content)
        output_manager.info(f"Saved raw HTML to {raw_html_path}")

    parser = lxml.etree.HTMLParser(encoding=response.encoding)
    root = lxml.etree.HTML(html_content, parser=parser)
    
    topic_elements = root.xpath("//a[contains(@class, 'issupop-btn') and @data-topic]" )
    
    # Deduplicate topics by title since BigKinds displays same topics in multiple UI sections
    seen_topics = set()
    topics = []
    
    for element in topic_elements:
        title = element.get('data-topic', '').strip()
        issue_name = element.get('data-issue-name', '').strip()
        news_ids_raw = element.get('data-news-ids', '')
        
        if not title or title in seen_topics:
            continue
        
        seen_topics.add(title)
        
        # Extract rank from HTML structure
        rank_element = element.xpath(".//span[@class='rank']")
        rank = int(rank_element[0].text.strip()) if rank_element else len(topics) + 1
        
        keywords = [kw.strip() for kw in issue_name.split(' ') if kw.strip()]
        news_ids = [nid.strip() for nid in news_ids_raw.split(',') if nid.strip()]
        
        # We can now construct a proper href
        encoded_keyword = urllib.parse.quote(title)
        href = f"/v2/search/news?issueKeyword={encoded_keyword}"

        topics.append({
            "rank": rank,
            "title": title,
            "issue_name": issue_name,
            "keywords": keywords,
            "news_count": len(news_ids),
            "news_ids": news_ids,
            "href": href
        })

    output_manager.info(f"Finished crawling {len(topics)} news topics.")
    return topics

def crawl_news_list(input_file, topic_index, output_file=None, output_manager=OutputManager()):
    """특정 주제에 대한 뉴스 목록을 가져옵니다."""
    output_manager.info(f"Crawling news list for topic {topic_index}...")
    
    # 주제 데이터 로드
    if not os.path.exists(input_file):
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
        output_manager.info(f"Topic with index {topic_index} not found")
        return None
    
    topic_title = topic_data["title"]
    news_ids_list = topic_data["news_ids"]
    news_ids_str = ",".join(news_ids_list)
    
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
    
    output_manager.info(f"Extracted {extracted_data['total_news']} news items")
    return extracted_data

def crawl_news_details(input_file, output_folder=None, output_manager=OutputManager()):
    """뉴스 목록에서 각 뉴스의 상세 정보를 가져옵니다."""
    output_manager.info("Crawling news details...")
    
    # 뉴스 목록 데이터 로드
    if not os.path.exists(input_file):
        output_manager.info(f"Input file not found: {input_file}")
        return None
    
    with open(input_file, 'r', encoding='utf-8') as f:
        news_list_data = json.load(f)
    
    news_list = news_list_data.get("news_list", [])
    if not news_list:
        output_manager.info("No news list found in input file")
        return None
    
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
            output_manager.info(f"    Error processing {news_id}: {e}")
            error_count += 1
    
    result = {
        "timestamp": datetime.now().isoformat(),
        "total_processed": len(news_list),
        "success_count": success_count,
        "error_count": error_count,
        "output_files": extracted_files
    }
    
    output_manager.info(f"Completed: {success_count} success, {error_count} errors")
    return result

import typer
from typing import Optional
from enum import Enum

class LogFormat(str, Enum):
    text = "text"
    json = "json"

app = typer.Typer(help="AI Newscast News Crawler - BigKinds 뉴스 크롤링 도구")

@app.command("news-topics")
def crawl_topics(
    output_file: Optional[str] = typer.Option(None, "--output-file", help="Output file path for JSON data"),
    print_log_format: LogFormat = typer.Option(LogFormat.text, "--print-log-format", help="Print log format"),
    print_log_file: Optional[str] = typer.Option(None, "--print-log-file", help="File to write JSON log output")
):
    """Crawl trending news topics from BigKinds"""
    start_time = time.time()
    output_manager = OutputManager(print_log_format.value, print_log_file)
    
    topics = crawl_news_topics(output_file, output_manager)
    
    if output_file:
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(topics, f, ensure_ascii=False, indent=2)
        output_manager.info(f"Saved topics to {output_file}")

    elapsed_time = time.time() - start_time
    
    if print_log_format == LogFormat.json:
        output_data = {
            "timestamp": datetime.now().isoformat(),
            "elapsed-time": f"{elapsed_time:.2f}s",
            "total-topics": len(topics),
            "output-file": output_file
        }
        output_manager.json_output(output_data)
    elif not output_file:
        print(json.dumps(topics, ensure_ascii=False, indent=2))

@app.command("news-list")
def crawl_list(
    input_file: str = typer.Option(..., "--input-file", help="Input topic list JSON file"),
    topic_index: int = typer.Option(..., "--topic-index", help="Topic index (0-based)"),
    output_file: Optional[str] = typer.Option(None, "--output-file", help="Output file path for news list JSON"),
    print_log_format: LogFormat = typer.Option(LogFormat.text, "--print-log-format", help="Print log format"),
    print_log_file: Optional[str] = typer.Option(None, "--print-log-file", help="File to write JSON log output")
):
    """Crawl news list for a specific topic"""
    start_time = time.time()
    output_manager = OutputManager(print_log_format.value, print_log_file)
    
    news_data = crawl_news_list(input_file, topic_index, output_file, output_manager)
    
    if news_data and output_file:
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(news_data, f, ensure_ascii=False, indent=2)
        output_manager.info(f"Saved news list to {output_file}")

    elapsed_time = time.time() - start_time
    
    if print_log_format == LogFormat.json:
        output_data = {
            "timestamp": datetime.now().isoformat(),
            "elapsed-time": f"{elapsed_time:.2f}s",
            "topic-index": topic_index,
            "total-news-list": news_data["total_news"] if news_data else 0,
            "output-file": output_file
        }
        output_manager.json_output(output_data)
    elif not output_file and news_data:
        print(json.dumps(news_data, ensure_ascii=False, indent=2))

@app.command("news-details")
def crawl_details(
    input_file: str = typer.Option(..., "--input-file", help="Input news list JSON file"),
    output_folder: Optional[str] = typer.Option(None, "--output-folder", help="Output folder for news detail JSON files"),
    print_log_format: LogFormat = typer.Option(LogFormat.text, "--print-log-format", help="Print log format"),
    print_log_file: Optional[str] = typer.Option(None, "--print-log-file", help="File to write JSON log output")
):
    """Crawl detailed news content"""
    start_time = time.time()
    output_manager = OutputManager(print_log_format.value, print_log_file)
    
    result = crawl_news_details(input_file, output_folder, output_manager)
    
    elapsed_time = time.time() - start_time
    
    if print_log_format == LogFormat.json:
        output_data = {
            "timestamp": datetime.now().isoformat(),
            "elapsed-time": f"{elapsed_time:.2f}s",
            "total-news-details": result["success_count"] if result else 0,
            "output-files": result["output_files"] if result else []
        }
        output_manager.json_output(output_data)
    elif result:
        print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    app()
import json
import time
import requests
import lxml.etree
import urllib.parse
import urllib3
import os
from datetime import datetime

urllib3.disable_warnings()

def crawl_news_topics(output_file=None, output_manager=None):
    """뉴스 토픽을 크롤링하고, data-* 속성에서 상세 정보를 추출합니다."""
    if output_manager:
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
        if output_manager:
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

    if output_manager:
        output_manager.info(f"Finished crawling {len(topics)} news topics.")
    return topics
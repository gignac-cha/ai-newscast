import json
import time
import requests
import lxml.etree
import urllib.parse
import os
from datetime import datetime

def crawl_news_topics(output_file=None):
    """뉴스 토픽을 크롤링하고, data-* 속성에서 상세 정보를 추출합니다."""
    print("Crawling news topics from BigKinds...")
    
    scheme = "https"
    netloc = "www.bigkinds.or.kr"
    path = '/'
    url = urllib.parse.urlunparse((scheme, netloc, path, '', '', ''))

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
        print(f"Saved raw HTML to {raw_html_path}")

    parser = lxml.etree.HTMLParser(encoding=response.encoding)
    root = lxml.etree.HTML(html_content, parser=parser)
    
    topic_elements = root.xpath("//a[contains(@class, 'issupop-btn') and @data-topic]" )
    
    topics = []
    for i, element in enumerate(topic_elements):
        title = element.get('data-topic', '').strip()
        issue_name = element.get('data-issue-name', '').strip()
        news_ids_raw = element.get('data-news-ids', '')
        
        if not title:
            continue

        keywords = [kw.strip() for kw in issue_name.split(' ') if kw.strip()]
        news_ids = [nid.strip() for nid in news_ids_raw.split(',') if nid.strip()]
        
        # We can now construct a proper href
        encoded_keyword = urllib.parse.quote(title)
        href = f"/v2/search/news?issueKeyword={encoded_keyword}"

        topics.append({
            "rank": i + 1,
            "title": title,
            "issue_name": issue_name,
            "keywords": keywords,
            "news_count": len(news_ids),
            "news_ids": news_ids,
            "href": href
        })

    print(f"Finished crawling {len(topics)} news topics.")
    return topics

def main():
    """메인 함수"""
    import argparse

    parser = argparse.ArgumentParser(description="News Crawler")
    subparsers = parser.add_subparsers(dest="command")

    parser_topics = subparsers.add_parser("news-topics", help="Crawl news topics")
    parser_topics.add_argument("--output-file", help="Output file path for JSON data")
    parser_topics.add_argument("--print-format", help="Print format (e.g., json)", default="text")

    args = parser.parse_args()

    if args.command == "news-topics":
        start_time = time.time()
        
        topics = crawl_news_topics(args.output_file)
        
        if args.output_file:
            os.makedirs(os.path.dirname(args.output_file), exist_ok=True)
            with open(args.output_file, "w", encoding="utf-8") as f:
                json.dump(topics, f, ensure_ascii=False, indent=2)
            print(f"Saved topics to {args.output_file}")

        elapsed_time = time.time() - start_time
        
        if args.print_format == 'json':
            output_data = {
                "timestamp": datetime.now().isoformat(),
                "elapsed-time": f"{elapsed_time:.2f}s",
                "total-topics": len(topics),
                "output-file": args.output_file
            }
            print(json.dumps(output_data, ensure_ascii=False, indent=2))
        elif not args.output_file:
            print(json.dumps(topics, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
"""HTML and JSON parsers for BigKinds data."""

import html
import json
import logging
from datetime import datetime
from typing import Dict, List, Any

from lxml import etree

from .models import TopicData, TopicListData, NewsItem, NewsListData, NewsDetail

logger = logging.getLogger(__name__)


class TopicParser:
    """Parser for topic list HTML."""
    
    @staticmethod
    def parse_topic_list(content: str) -> TopicListData:
        """Parse topic list from HTML or JSON content."""
        logger.info("Parsing topic list...")
        
        # Try to detect if content is JSON
        if TopicParser._is_json_content(content):
            logger.info("Detected JSON format, parsing as JSON API response")
            return TopicParser._parse_json_topic_list(content)
        else:
            logger.info("Detected HTML format, parsing as HTML")
            return TopicParser._parse_html_topic_list(content)
    
    @staticmethod
    def _is_json_content(content: str) -> bool:
        """Check if content is JSON format."""
        content = content.strip()
        return content.startswith('{') or content.startswith('[')
    
    @staticmethod
    def _parse_json_topic_list(json_content: str) -> TopicListData:
        """Parse topic list from JSON API response."""
        try:
            data = json.loads(json_content)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON content: {e}")
            raise ValueError(f"Invalid JSON content: {e}")
        
        # Extract metadata
        metadata = TopicParser._extract_json_metadata(data)
        
        # Extract topics from todayIssueTop10
        topics = TopicParser._extract_json_topics(data)
        
        metadata["total_topics"] = len(topics)
        
        logger.info(f"Parsed {len(topics)} topics successfully from JSON")
        return TopicListData(metadata=metadata, topics=topics)
    
    @staticmethod
    def _parse_html_topic_list(html_content: str) -> TopicListData:
        """Parse topic list from HTML content (legacy method)."""
        root = etree.HTML(html_content)
        
        # Extract metadata
        metadata = TopicParser._extract_metadata(root)
        
        # Extract topics
        topics = TopicParser._extract_topics(root)
        
        metadata["total_topics"] = len(topics)
        
        logger.info(f"Parsed {len(topics)} topics successfully from HTML")
        return TopicListData(metadata=metadata, topics=topics)
    
    @staticmethod
    def _extract_metadata(root) -> Dict[str, Any]:
        """Extract page metadata."""
        now = datetime.now()
        
        # Try to find date information from page
        extraction_date = ""
        for element in root.xpath('//*[contains(text(), "2025년")]'):
            text = element.text or ""
            if "년" in text and "월" in text and "일" in text:
                extraction_date = text.strip()
                break
        
        return {
            "extraction_date": extraction_date,
            "extraction_timestamp": now.isoformat(),
            "total_topics": 0,  # Will be updated later
        }
    
    @staticmethod
    def _extract_topics(root) -> List[TopicData]:
        """Extract topics from HTML."""
        topics = []
        topic_buttons = root.xpath('//a[@class="issupop-btn"]')
        
        for index, button in enumerate(topic_buttons):
            try:
                topic = TopicParser._parse_topic_button(button, index + 1)
                if topic:
                    topics.append(topic)
            except Exception as e:
                logger.warning(f"Failed to parse topic at index {index}: {e}")
        
        return topics
    
    @staticmethod
    def _parse_topic_button(button, default_rank: int) -> TopicData | None:
        """Parse individual topic button."""
        news_ids_str = button.get("data-news-ids", "")
        topic_text = html.unescape(button.get("data-topic", ""))
        issue_name = html.unescape(button.get("data-issue-name", ""))
        
        if not topic_text:
            return None
        
        # Find parent li element
        li_parent = button.xpath('./ancestor::li')
        li_parent = li_parent[0] if li_parent else None
        
        # Extract rank
        rank = default_rank
        if li_parent is not None:
            rank_elem = li_parent.xpath('.//span[@class="rank"]')
            if rank_elem and rank_elem[0].text:
                try:
                    rank = int(rank_elem[0].text.strip())
                except ValueError:
                    pass
        
        # Extract news count
        news_count = 0
        if li_parent is not None:
            news_count_elem = li_parent.xpath('.//span[@class="newsNo"]')
            if news_count_elem and news_count_elem[0].text:
                count_text = news_count_elem[0].text.replace("건", "").strip()
                try:
                    news_count = int(count_text)
                except ValueError:
                    pass
        
        # Extract summary
        summary = ""
        if li_parent is not None:
            summary_elem = li_parent.xpath('.//input[@type="hidden"]')
            if summary_elem:
                summary = html.unescape(summary_elem[0].get("value", ""))
        
        # Process news IDs
        news_ids = [nid.strip() for nid in news_ids_str.split(",") if nid.strip()]
        
        # Extract keywords from issue name
        keywords = [kw.strip() for kw in issue_name.split() if kw.strip()]
        
        return TopicData(
            rank=rank,
            topic=TopicParser._clean_text(topic_text),
            summary=TopicParser._clean_text(summary),
            keywords=keywords,
            news_count=news_count,
            news_ids=news_ids,
            issue_name=TopicParser._clean_text(issue_name),
        )
    
    @staticmethod
    def _clean_text(text: str) -> str:
        """Clean text by removing extra whitespace."""
        return " ".join(text.split()).strip()
    
    @staticmethod
    def _extract_json_metadata(data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract metadata from JSON API response."""
        now = datetime.now()
        
        # Extract date from todayIssueCnt if available
        extraction_date = ""
        if "todayIssueCnt" in data:
            issue_cnt = data["todayIssueCnt"]
            if "date" in issue_cnt:
                date_str = issue_cnt["date"]
                try:
                    # Convert from YYYYMMDD to readable format
                    if len(date_str) == 8:
                        year = date_str[:4]
                        month = date_str[4:6]
                        day = date_str[6:8]
                        extraction_date = f"{year}년 {month}월 {day}일"
                except (ValueError, TypeError):
                    pass
        
        metadata = {
            "extraction_date": extraction_date,
            "extraction_timestamp": now.isoformat(),
            "total_topics": 0,  # Will be updated later
        }
        
        # Add additional metadata from todayIssueCnt
        if "todayIssueCnt" in data:
            issue_cnt = data["todayIssueCnt"]
            metadata.update({
                "news_count": issue_cnt.get("news_cnt", ""),
                "topic_count": issue_cnt.get("topic_cnt", ""),
                "analyzed_order": issue_cnt.get("analyzed_order", ""),
                "update_datetime": issue_cnt.get("update_dt", ""),
            })
        
        return metadata
    
    @staticmethod
    def _extract_json_topics(data: Dict[str, Any]) -> List[TopicData]:
        """Extract topics from JSON API response."""
        topics = []
        
        if "todayIssueTop10" not in data:
            logger.warning("No 'todayIssueTop10' found in JSON data")
            return topics
        
        today_issues = data["todayIssueTop10"]
        if not isinstance(today_issues, list):
            logger.warning("'todayIssueTop10' is not a list")
            return topics
        
        for item in today_issues:
            try:
                topic = TopicParser._parse_json_topic_item(item)
                if topic:
                    topics.append(topic)
            except Exception as e:
                logger.warning(f"Failed to parse topic item: {e}")
        
        return topics
    
    @staticmethod
    def _parse_json_topic_item(item: Dict[str, Any]) -> TopicData | None:
        """Parse individual topic item from JSON."""
        if not item:
            return None
        
        # Extract rank
        rank = 1
        try:
            rank_str = item.get("ROWNUM", "1.0")
            rank = int(float(rank_str))
        except (ValueError, TypeError):
            pass
        
        # Extract topic text
        topic_text = item.get("topic", "")
        if not topic_text:
            return None
        
        # Extract keywords from topic_keyword
        keywords = []
        topic_keyword = item.get("topic_keyword", "")
        if topic_keyword:
            keywords = [kw.strip() for kw in topic_keyword.split(",") if kw.strip()]
        
        # Extract news IDs from news_cluster
        news_ids = []
        news_cluster = item.get("news_cluster", "")
        if news_cluster:
            news_ids = [nid.strip() for nid in news_cluster.split(",") if nid.strip()]
        
        # Extract news count from keywords or estimate from news_ids
        news_count = len(news_ids)
        
        # Use topic_content as summary
        summary = item.get("topic_content", "")
        
        # Use topic_origin as issue_name
        issue_name = item.get("topic_origin", "")
        
        return TopicData(
            rank=rank,
            topic=TopicParser._clean_text(topic_text),
            summary=TopicParser._clean_text(summary),
            keywords=keywords[:10],  # Limit to first 10 keywords
            news_count=news_count,
            news_ids=news_ids,
            issue_name=TopicParser._clean_text(issue_name),
        )


class NewsParser:
    """Parser for news list JSON data."""
    
    @staticmethod
    def parse_news_list(response_data: Dict[str, Any], topic: str) -> NewsListData:
        """Parse news list from API response."""
        logger.info(f"Parsing news list for topic: {topic}")
        
        news_list = []
        total_news = 0
        
        if "newsList" in response_data and isinstance(response_data["newsList"], list):
            total_news = len(response_data["newsList"])
            
            for news_item in response_data["newsList"]:
                try:
                    parsed_news = NewsParser._parse_news_item(news_item)
                    if parsed_news:
                        news_list.append(parsed_news)
                except Exception as e:
                    logger.warning(f"Failed to parse news item: {e}")
        
        logger.info(f"Parsed {len(news_list)} news items successfully")
        
        return NewsListData(
            topic=topic,
            extraction_timestamp=datetime.now().isoformat(),
            total_news=total_news,
            news_list=news_list,
            news_ids=response_data.get("newsIds"),
        )
    
    @staticmethod
    def _parse_news_item(news_item: Dict[str, Any]) -> NewsItem | None:
        """Parse individual news item."""
        if not news_item:
            return None
        
        # Extract keywords
        keywords = []
        if "inKeyword" in news_item and isinstance(news_item["inKeyword"], list):
            keywords = [kw.get("label", "") for kw in news_item["inKeyword"] if kw.get("label")]
        
        return NewsItem(
            news_id=news_item.get("news_node_id", ""),
            title=NewsParser._clean_text(news_item.get("title", "")),
            provider_name=news_item.get("provider_name", ""),
            byline=news_item.get("byline", ""),
            published_date=news_item.get("published_date", ""),
            summary=NewsParser._clean_text(news_item.get("summary", "")),
            keywords=keywords,
            category=news_item.get("category", ""),
            url=news_item.get("url", ""),
        )
    
    @staticmethod
    def _clean_text(text: str) -> str:
        """Clean text by removing extra whitespace."""
        return " ".join(str(text).split()).strip()


class NewsDetailParser:
    """Parser for news detail JSON data."""
    
    @staticmethod
    def parse_news_detail(response_data: Dict[str, Any]) -> NewsDetail:
        """Parse news detail from API response."""
        logger.debug("Parsing news detail from response data")
        
        metadata = {}
        content = None
        
        if "detail" in response_data:
            detail = response_data["detail"]
            
            content = NewsDetailParser._clean_text(detail.get("CONTENT", ""))
            
            metadata = {
                "title": NewsDetailParser._clean_text(detail.get("TITLE", "")),
                "provider": detail.get("PROVIDER_NAME", ""),
                "byline": detail.get("BYLINE", ""),
                "published_date": detail.get("PUBLISHED_DATE", ""),
                "category": detail.get("CATEGORY", ""),
                "keywords": detail.get("KEYWORDS", ""),
                "summary": NewsDetailParser._clean_text(detail.get("SUMMARY", "")),
                "url": detail.get("URL", ""),
            }
        
        return NewsDetail(
            extraction_timestamp=datetime.now().isoformat(),
            news_detail=response_data.get("detail"),
            content=content,
            metadata=metadata,
        )
    
    @staticmethod
    def _clean_text(text: str) -> str:
        """Clean text by removing extra whitespace."""
        return " ".join(str(text).split()).strip()
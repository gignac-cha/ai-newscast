"""Main crawler implementation."""

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple

from .client import BigKindsClient
from .models import (
    CrawlerConfig,
    OutputConfig,
    TopicListData,
    NewsListData,
    NewsDetail,
    TopicData,
)
from .parsers import TopicParser, NewsParser, NewsDetailParser
from .utils import create_output_folder, save_json_file, save_text_file

logger = logging.getLogger(__name__)


class BigKindsCrawler:
    """Main crawler class for BigKinds news."""
    
    def __init__(
        self,
        crawler_config: Optional[CrawlerConfig] = None,
        output_config: Optional[OutputConfig] = None,
    ):
        self.crawler_config = crawler_config or CrawlerConfig()
        self.output_config = output_config or OutputConfig()
        
        # Setup logging
        self._setup_logging()
    
    def _setup_logging(self):
        """Setup logging configuration."""
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    
    def crawl_topic_list(self) -> Tuple[TopicListData, str]:
        """Crawl topic list from BigKinds homepage."""
        logger.info("Starting topic list crawling...")
        start_time = datetime.now()
        
        # Create output folder
        output_path = create_output_folder(self.output_config)
        
        with BigKindsClient(self.crawler_config) as client:
            # Fetch HTML content
            html_content = client.fetch_topic_list_page()
            
            # Save HTML if configured
            if self.output_config.save_html:
                html_path = os.path.join(output_path, "topic-list.html")
                save_text_file(html_path, html_content)
                logger.info(f"HTML saved to: {html_path}")
            
            # Parse topics
            topic_list_data = TopicParser.parse_topic_list(html_content)
            
            # Save JSON if configured
            if self.output_config.save_json:
                json_path = os.path.join(output_path, "topic-list.json")
                save_json_file(json_path, topic_list_data.model_dump())
                logger.info(f"JSON saved to: {json_path}")
        
        duration = (datetime.now() - start_time).total_seconds()
        logger.info(f"Topic list crawling completed in {duration:.3f}s")
        logger.info(f"Found {len(topic_list_data.topics)} topics")
        
        return topic_list_data, output_path
    
    def crawl_news_list_for_topic(
        self,
        topic: TopicData,
        output_path: str,
        date_range_days: int = 1,
    ) -> Tuple[NewsListData, str]:
        """Crawl news list for a specific topic."""
        logger.info(f"Starting news list crawling for topic: {topic.topic}")
        start_time = datetime.now()
        
        # Create topic-specific output folder
        topic_folder = f"topic-{topic.rank:02d}"
        topic_output_path = os.path.join(output_path, topic_folder)
        os.makedirs(topic_output_path, exist_ok=True)
        
        with BigKindsClient(self.crawler_config) as client:
            # Get date range
            start_date, end_date = client.get_date_range(date_range_days)
            
            # Fetch news list
            response_data = client.fetch_news_list(
                topic.topic, topic.news_ids, start_date, end_date
            )
            
            # Parse news list
            news_list_data = NewsParser.parse_news_list(response_data, topic.topic)
            
            # Save JSON if configured
            if self.output_config.save_json:
                json_path = os.path.join(topic_output_path, "news-list.json")
                save_json_file(json_path, news_list_data.model_dump())
                logger.info(f"News list JSON saved to: {json_path}")
        
        duration = (datetime.now() - start_time).total_seconds()
        logger.info(f"News list crawling completed in {duration:.3f}s")
        logger.info(f"Found {len(news_list_data.news_list)} news items")
        
        return news_list_data, topic_output_path
    
    def crawl_news_details(
        self, news_list_data: NewsListData, topic_output_path: str
    ) -> Tuple[int, int, str]:
        """Crawl detailed content for news items."""
        logger.info(f"Starting news details crawling for {len(news_list_data.news_list)} items")
        start_time = datetime.now()
        
        # Create news details output folder
        news_output_path = os.path.join(topic_output_path, "news")
        os.makedirs(news_output_path, exist_ok=True)
        
        success_count = 0
        error_count = 0
        
        with BigKindsClient(self.crawler_config) as client:
            for i, news_item in enumerate(news_list_data.news_list):
                try:
                    logger.debug(f"Processing news item {i+1}/{len(news_list_data.news_list)}: {news_item.news_id}")
                    
                    # Convert news ID format for API (hyphens to dots)
                    api_news_id = news_item.news_id.replace("-", ".")
                    
                    # Fetch news detail
                    response_data = client.fetch_news_detail(api_news_id)
                    
                    # Parse news detail
                    news_detail = NewsDetailParser.parse_news_detail(response_data)
                    
                    # Save JSON if configured
                    if self.output_config.save_json:
                        json_path = os.path.join(news_output_path, f"{news_item.news_id}.json")
                        save_json_file(json_path, news_detail.model_dump())
                    
                    success_count += 1
                    
                except Exception as e:
                    error_count += 1
                    logger.warning(f"Failed to process news item {news_item.news_id}: {e}")
        
        duration = (datetime.now() - start_time).total_seconds()
        logger.info(f"News details crawling completed in {duration:.3f}s")
        logger.info(f"Success: {success_count}, Errors: {error_count}")
        
        return success_count, error_count, news_output_path
    
    def crawl_full_pipeline(self, max_topics: int = 10) -> Tuple[TopicListData, str]:
        """Run the full crawling pipeline."""
        logger.info(f"Starting full crawling pipeline for top {max_topics} topics")
        start_time = datetime.now()
        
        try:
            # Step 1: Crawl topic list
            topic_list_data, output_path = self.crawl_topic_list()
            
            # Step 2: Crawl news lists for each topic
            topics_to_process = topic_list_data.topics[:max_topics]
            
            for topic in topics_to_process:
                try:
                    news_list_data, topic_output_path = self.crawl_news_list_for_topic(
                        topic, output_path
                    )
                    logger.info(
                        f"Completed topic {topic.rank}: {topic.topic} "
                        f"({len(news_list_data.news_list)} news items)"
                    )
                except Exception as e:
                    logger.error(f"Failed to process topic {topic.rank}: {topic.topic} - {e}")
            
            duration = (datetime.now() - start_time).total_seconds()
            logger.info(f"Full pipeline completed in {duration:.3f}s")
            
            return topic_list_data, output_path
            
        except Exception as e:
            logger.error(f"Full pipeline failed: {e}")
            raise
    
    def load_topic_list(self, output_path: str) -> TopicListData:
        """Load topic list from JSON file."""
        json_path = os.path.join(output_path, "topic-list.json")
        
        if not os.path.exists(json_path):
            raise FileNotFoundError(f"Topic list not found: {json_path}")
        
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        return TopicListData(**data)
    
    def load_news_list(self, topic_output_path: str) -> NewsListData:
        """Load news list from JSON file."""
        json_path = os.path.join(topic_output_path, "news-list.json")
        
        if not os.path.exists(json_path):
            raise FileNotFoundError(f"News list not found: {json_path}")
        
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        return NewsListData(**data)
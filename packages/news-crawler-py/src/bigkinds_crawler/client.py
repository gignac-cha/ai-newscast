"""BigKinds API client."""

import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List

import requests
import urllib3
from lxml import etree

from .models import CrawlerConfig

# Disable SSL warnings
urllib3.disable_warnings()

logger = logging.getLogger(__name__)


class BigKindsClient:
    """BigKinds API client for news crawling."""
    
    def __init__(self, config: CrawlerConfig):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": config.user_agent,
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
            "Referer": "https://www.bigkinds.or.kr/",
            "X-Requested-With": "XMLHttpRequest"
        })
        self.session.verify = False
        
        # 세션 초기화를 위해 메인 페이지 방문
        try:
            self.session.get(f"{config.base_url}/", timeout=config.timeout)
        except Exception:
            pass  # 실패해도 계속 진행
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.session.close()
    
    def _retry_request(self, func, *args, **kwargs) -> Any:
        """Retry request with exponential backoff."""
        last_exception = None
        
        for attempt in range(self.config.retry_attempts):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                if attempt < self.config.retry_attempts - 1:
                    delay = self.config.retry_delay * (2 ** attempt)
                    logger.warning(f"Request failed (attempt {attempt + 1}), retrying in {delay}s: {e}")
                    time.sleep(delay)
                else:
                    logger.error(f"Request failed after {self.config.retry_attempts} attempts: {e}")
        
        raise last_exception
    
    def fetch_topic_list_page(self) -> str:
        """Fetch the main page containing topic list."""
        logger.info("Fetching topic list page...")
        
        def _fetch():
            response = self.session.get(self.config.base_url, timeout=self.config.timeout)
            response.raise_for_status()
            return response.text
        
        html_content = self._retry_request(_fetch)
        logger.info("Topic list page fetched successfully")
        return html_content
    
    def fetch_news_list(
        self,
        topic: str,
        news_ids: List[str],
        start_date: str,
        end_date: str
    ) -> Dict[str, Any]:
        """Fetch news list for a specific topic."""
        logger.info(f"Fetching news list for topic: {topic}")
        
        url = f"{self.config.base_url}/news/getNetworkDataAnalysis.do"
        news_ids_str = ",".join(news_ids)
        
        headers = {
            "Referer": "https://www.bigkinds.or.kr/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest"
        }
        
        data = {
            "pageInfo": "newsResult",
            "keyword": topic,
            "startDate": start_date,
            "endDate": end_date,
            "newsCluster": news_ids_str,
            "resultNo": "100",
        }
        
        def _fetch():
            response = self.session.post(url, headers=headers, data=data, timeout=self.config.timeout)
            response.raise_for_status()
            return response.json()
        
        result = self._retry_request(_fetch)
        logger.info(f"Fetched {len(result.get('newsList', []))} news items for topic: {topic}")
        return result
    
    def fetch_news_detail(self, news_id: str) -> Dict[str, Any]:
        """Fetch detailed content for a specific news item."""
        logger.debug(f"Fetching news detail for ID: {news_id}")
        
        url = f"{self.config.base_url}/news/detailView.do"
        
        params = {
            "docId": news_id,
            "returnCnt": "1",
            "sectionDiv": "1000",
        }
        
        def _fetch():
            response = self.session.get(url, params=params, timeout=self.config.timeout)
            response.raise_for_status()
            return response.json()
        
        result = self._retry_request(_fetch)
        logger.debug(f"Fetched news detail for ID: {news_id}")
        return result
    
    @staticmethod
    def get_date_range(days: int = 1) -> tuple[str, str]:
        """Get date range for news search."""
        today = datetime.now()
        start_date = (today - timedelta(days=days)).strftime("%Y-%m-%d")
        end_date = today.strftime("%Y-%m-%d")
        return start_date, end_date
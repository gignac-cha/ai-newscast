"""Data models for BigKinds crawler."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class TopicData(BaseModel):
    """Topic data model."""
    
    rank: int
    topic: str
    summary: str = ""
    keywords: List[str] = Field(default_factory=list)
    news_count: int = 0
    news_ids: List[str] = Field(default_factory=list)
    issue_name: str = ""


class TopicListData(BaseModel):
    """Topic list data model."""
    
    metadata: dict
    topics: List[TopicData]


class NewsItem(BaseModel):
    """News item data model."""
    
    news_id: str
    title: str
    provider_name: str = ""
    byline: str = ""
    published_date: str = ""
    summary: str = ""
    keywords: List[str] = Field(default_factory=list)
    category: str = ""
    url: str = ""


class NewsListData(BaseModel):
    """News list data model."""
    
    topic: str
    extraction_timestamp: str
    total_news: int
    news_list: List[NewsItem]
    news_ids: Optional[List[str]] = None


class NewsDetail(BaseModel):
    """News detail data model."""
    
    extraction_timestamp: str
    news_detail: Optional[dict] = None
    content: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


class CrawlerConfig(BaseModel):
    """Crawler configuration model."""
    
    base_url: str = "https://bigkinds.or.kr"
    user_agent: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
    timeout: int = 30
    retry_attempts: int = 3
    retry_delay: int = 1
    max_concurrent_requests: int = 5


class OutputConfig(BaseModel):
    """Output configuration model."""
    
    output_dir: str = "./output"
    save_html: bool = True
    save_json: bool = True
    create_timestamp_folder: bool = True
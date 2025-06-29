#!/usr/bin/env python3
"""
AI Newscast News Crawler - BigKinds 뉴스 크롤링 도구
"""

import json
import time
import os
from datetime import datetime
from typing import Optional
from enum import Enum

import typer

from output_manager import OutputManager
from crawl_news_topics import crawl_news_topics
from crawl_news_list import crawl_news_list
from crawl_news_details import crawl_news_details

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
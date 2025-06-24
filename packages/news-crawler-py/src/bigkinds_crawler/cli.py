"""Command-line interface for BigKinds crawler."""

import logging
import os
import sys
from pathlib import Path

import click

from .crawler import BigKindsCrawler
from .models import CrawlerConfig, OutputConfig, TopicData
from .utils import get_latest_output_folder, format_duration


@click.group()
@click.option(
    "--output-dir",
    default="./output",
    help="Output directory for crawled data",
    show_default=True,
)
@click.option(
    "--no-html",
    is_flag=True,
    help="Skip saving HTML files",
)
@click.option(
    "--no-json",
    is_flag=True,
    help="Skip saving JSON files",
)
@click.option(
    "--no-timestamp",
    is_flag=True,
    help="Do not create timestamp folder",
)
@click.option(
    "--timeout",
    default=30,
    help="Request timeout in seconds",
    show_default=True,
)
@click.option(
    "--retry-attempts",
    default=3,
    help="Number of retry attempts",
    show_default=True,
)
@click.option(
    "--verbose",
    "-v",
    is_flag=True,
    help="Enable verbose logging",
)
@click.pass_context
def cli(
    ctx,
    output_dir,
    no_html,
    no_json,
    no_timestamp,
    timeout,
    retry_attempts,
    verbose,
):
    """BigKinds news crawler for AI News Cast."""
    # Setup logging
    log_level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(levelname)s - %(message)s",
        datefmt="%H:%M:%S",
    )
    
    # Create configurations
    crawler_config = CrawlerConfig(
        timeout=timeout,
        retry_attempts=retry_attempts,
    )
    
    output_config = OutputConfig(
        output_dir=output_dir,
        save_html=not no_html,
        save_json=not no_json,
        create_timestamp_folder=not no_timestamp,
    )
    
    # Store in context
    ctx.ensure_object(dict)
    ctx.obj["crawler_config"] = crawler_config
    ctx.obj["output_config"] = output_config


@cli.command()
@click.pass_context
def topics(ctx):
    """Crawl topic list from BigKinds homepage."""
    crawler_config = ctx.obj["crawler_config"]
    output_config = ctx.obj["output_config"]
    
    try:
        crawler = BigKindsCrawler(crawler_config, output_config)
        topic_list_data, output_path = crawler.crawl_topic_list()
        
        click.echo(f"\\n✅ Topic list crawling completed!")
        click.echo(f"📁 Output: {output_path}")
        click.echo(f"📊 Topics found: {len(topic_list_data.topics)}")
        
        # Show top 5 topics
        click.echo(f"\\n🔥 Top 5 topics:")
        for i, topic in enumerate(topic_list_data.topics[:5]):
            click.echo(f"  {i+1}. {topic.topic} ({topic.news_count} news)")
        
    except Exception as e:
        click.echo(f"❌ Error: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.argument("data_path", type=click.Path(exists=True))
@click.option(
    "--topics",
    "-t",
    default="1,2,3",
    help="Topic ranks to process (comma-separated)",
    show_default=True,
)
@click.option(
    "--days",
    "-d",
    default=1,
    help="Number of days to look back",
    show_default=True,
)
@click.pass_context
def news(ctx, data_path, topics, days):
    """Crawl news list for specified topics."""
    crawler_config = ctx.obj["crawler_config"]
    output_config = ctx.obj["output_config"]
    output_config.create_timestamp_folder = False  # Use existing folder
    output_config.output_dir = data_path
    
    try:
        crawler = BigKindsCrawler(crawler_config, output_config)
        
        # Load topic list
        topic_list_data = crawler.load_topic_list(data_path)
        topic_ranks = [int(r.strip()) for r in topics.split(",")]
        
        click.echo(f"\\n📰 Processing {len(topic_ranks)} topics...")
        
        for rank in topic_ranks:
            # Find topic by rank
            topic = None
            for t in topic_list_data.topics:
                if t.rank == rank:
                    topic = t
                    break
            
            if not topic:
                click.echo(f"⚠️  Topic with rank {rank} not found")
                continue
            
            click.echo(f"\\n📄 Processing topic {rank}: {topic.topic}")
            
            news_list_data, topic_output_path = crawler.crawl_news_list_for_topic(
                topic, data_path, days
            )
            
            click.echo(f"✅ Found {len(news_list_data.news_list)} news items")
        
        click.echo(f"\\n🎉 News crawling completed!")
        
    except Exception as e:
        click.echo(f"❌ Error: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.argument("topic_path", type=click.Path(exists=True))
@click.pass_context
def details(ctx, topic_path):
    """Crawl detailed content for news items in a topic folder."""
    crawler_config = ctx.obj["crawler_config"]
    output_config = ctx.obj["output_config"]
    
    try:
        crawler = BigKindsCrawler(crawler_config, output_config)
        
        # Load news list
        news_list_data = crawler.load_news_list(topic_path)
        
        click.echo(f"\\n🔍 Processing {len(news_list_data.news_list)} news items for details...")
        click.echo(f"📁 Topic: {news_list_data.topic}")
        
        success_count, error_count, news_output_path = crawler.crawl_news_details(
            news_list_data, topic_path
        )
        
        click.echo(f"\\n✅ News details crawling completed!")
        click.echo(f"📊 Success: {success_count}, Errors: {error_count}")
        click.echo(f"📁 Output: {news_output_path}")
        
    except Exception as e:
        click.echo(f"❌ Error: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.option(
    "--max-topics",
    "-t",
    default=10,
    help="Maximum number of topics to process",
    show_default=True,
)
@click.option(
    "--include-details",
    is_flag=True,
    help="Include detailed content crawling for first topic",
)
@click.pass_context
def pipeline(ctx, max_topics, include_details):
    """Run the full crawling pipeline."""
    crawler_config = ctx.obj["crawler_config"]
    output_config = ctx.obj["output_config"]
    
    try:
        click.echo(f"🚀 Starting full crawling pipeline...")
        click.echo(f"📊 Max topics: {max_topics}")
        click.echo(f"🔍 Include details: {'Yes' if include_details else 'No'}")
        
        crawler = BigKindsCrawler(crawler_config, output_config)
        topic_list_data, output_path = crawler.crawl_full_pipeline(max_topics)
        
        # Optionally crawl details for first topic
        if include_details and topic_list_data.topics:
            click.echo(f"\\n🔍 Crawling details for first topic...")
            
            first_topic = topic_list_data.topics[0]
            topic_path = os.path.join(output_path, "topic-01")
            
            if os.path.exists(os.path.join(topic_path, "news-list.json")):
                news_list_data = crawler.load_news_list(topic_path)
                success_count, error_count, news_output_path = crawler.crawl_news_details(
                    news_list_data, topic_path
                )
                
                click.echo(f"✅ Details crawling completed!")
                click.echo(f"📊 Success: {success_count}, Errors: {error_count}")
        
        click.echo(f"\\n🎉 Full pipeline completed!")
        click.echo(f"📁 Output: {output_path}")
        click.echo(f"📊 Total topics: {len(topic_list_data.topics)}")
        
    except Exception as e:
        click.echo(f"❌ Error: {e}", err=True)
        sys.exit(1)


def main():
    """Main entry point."""
    cli()


if __name__ == "__main__":
    main()
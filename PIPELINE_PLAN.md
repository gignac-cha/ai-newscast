```
[Command] OUTPUT_FOLDER=$(realpath output/{ISO_TIMESTAMP}) pnpm run:crawler:news-topics -- --output-file $OUTPUT_FOLDER/topic-list.json --print-format json
- [Sub Process] turbo crawler:news-topics --output-file $OUTPUT_FOLDER/topic-list.json --print-format json
  - [Sub Process] pnpm -F @ai-newscast/news-crawler crawl:news-topics --output-file $OUTPUT_FOLDER/topic-list.json
    - [Sub Process] python news_crawler.py news-topics --output-file $OUTPUT_FOLDER/topic-list.json
        or node --experimental-strip-types news-crawler.ts news-topics --output-file $OUTPUT_FOLDER/topic-list.json
      - [Output File] $OUTPUT_FOLDER/topic-list.raw.html
      - [Output File] $OUTPUT_FOLDER/topic-list.json
      - [Output Text] {
        "timestamp": "{ISO_TIMESTAMP}",
        "elapsed-time": "{ELAPSED_TIME}",
        "total-topics": {TOTAL_TOPICS},
        "output-file": "$OUTPUT_FOLDER/topic-list.json"
      }

[Command] OUTPUT_FOLDER=$(realpath output/{ISO_TIMESTAMP}) pnpm run:crawler:news-list -- --input-file $OUTPUT_FOLDER/topic-list.json --all --output-folder $OUTPUT_FOLDER --print-format json
- [Sub Process] turbo crawler:news-list --input-file $OUTPUT_FOLDER/topic-list.json --all --output-folder $OUTPUT_FOLDER --print-format json
  - [Sub Process] pnpm -F @ai-newscast/news-crawler crawl:news-list --input-file $OUTPUT_FOLDER/topic-list.json --all --output-folder $OUTPUT_FOLDER --print-format json
    - [Sub Process] pnpm -F @ai-newscast/news-crawler crawl:news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 0 --output-file $OUTPUT_FOLDER/topic-01/news-list.json --print-format json
      - [Sub Process] python news_crawler.py news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 0 --output-file $OUTPUT_FOLDER/topic-01/news-list.json --print-format json
        or node --experimental-strip-types news-crawler.ts news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 0 --output-file $OUTPUT_FOLDER/topic-01/news-list.json --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-01/news-list.json
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "topic-index": 0,
          "total-news-list": {TOTAL_NEWS_LIST},
          "output-file": "$OUTPUT_FOLDER/topic-01/news-list.json"
        }
    - [Sub Process] pnpm -F @ai-newscast/news-crawler crawl:news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 1 --output-file $OUTPUT_FOLDER/topic-02/news-list.json --print-format json
      - [Sub Process] python news_crawler.py news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 1 --output-file $OUTPUT_FOLDER/topic-02/news-list.json --print-format json
        or node --experimental-strip-types news-crawler.ts news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 1 --output-file $OUTPUT_FOLDER/topic-02/news-list.json --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-02/news-list.json
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "topic-index": 1,
          "total-news-list": {TOTAL_NEWS_LIST},
          "output-file": "$OUTPUT_FOLDER/topic-02/news-list.json"
        }
    - [Sub Process] pnpm -F @ai-newscast/news-crawler crawl:news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 2 --output-file $OUTPUT_FOLDER/topic-03/news-list.json --print-format json
      - [Sub Process] python news_crawler.py news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 2 --output-file $OUTPUT_FOLDER/topic-03/news-list.json --print-format json
        or node --experimental-strip-types news-crawler.ts news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 2 --output-file $OUTPUT_FOLDER/topic-03/news-list.json --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-03/news-list.json
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "topic-index": 2,
          "total-news-list": {TOTAL_NEWS_LIST},
          "output-file": "$OUTPUT_FOLDER/topic-03/news-list.json"
        }
    - [Sub Process] pnpm -F @ai-newscast/news-crawler crawl:news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 3 --output-file $OUTPUT_FOLDER/topic-04/news-list.json --print-format json
      - [Sub Process] python news_crawler.py news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 3 --output-file $OUTPUT_FOLDER/topic-04/news-list.json --print-format json
        or node --experimental-strip-types news-crawler.ts news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 3 --output-file $OUTPUT_FOLDER/topic-04/news-list.json --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-04/news-list.json
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "topic-index": 3,
          "total-news-list": {TOTAL_NEWS_LIST},
          "output-file": "$OUTPUT_FOLDER/topic-04/news-list.json"
        }
    - [Sub Process] pnpm -F @ai-newscast/news-crawler crawl:news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 4 --output-file $OUTPUT_FOLDER/topic-05/news-list.json --print-format json
      - [Sub Process] python news_crawler.py news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 4 --output-file $OUTPUT_FOLDER/topic-05/news-list.json --print-format json
        or node --experimental-strip-types news-crawler.ts news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 4 --output-file $OUTPUT_FOLDER/topic-05/news-list.json --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-05/news-list.json
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "topic-index": 4,
          "total-news-list": {TOTAL_NEWS_LIST},
          "output-file": "$OUTPUT_FOLDER/topic-05/news-list.json"
        }
    - [Sub Process] pnpm -F @ai-newscast/news-crawler crawl:news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 5 --output-file $OUTPUT_FOLDER/topic-06/news-list.json --print-format json
      - [Sub Process] python news_crawler.py news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 5 --output-file $OUTPUT_FOLDER/topic-06/news-list.json --print-format json
        or node --experimental-strip-types news-crawler.ts news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 5 --output-file $OUTPUT_FOLDER/topic-06/news-list.json --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-06/news-list.json
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "topic-index": 5,
          "total-news-list": {TOTAL_NEWS_LIST},
          "output-file": "$OUTPUT_FOLDER/topic-06/news-list.json"
        }
    - [Sub Process] pnpm -F @ai-newscast/news-crawler crawl:news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 6 --output-file $OUTPUT_FOLDER/topic-07/news-list.json --print-format json
      - [Sub Process] python news_crawler.py news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 6 --output-file $OUTPUT_FOLDER/topic-07/news-list.json --print-format json
        or node --experimental-strip-types news-crawler.ts news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 6 --output-file $OUTPUT_FOLDER/topic-07/news-list.json --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-07/news-list.json
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "topic-index": 6,
          "total-news-list": {TOTAL_NEWS_LIST},
          "output-file": "$OUTPUT_FOLDER/topic-07/news-list.json"
        }
    - [Sub Process] pnpm -F @ai-newscast/news-crawler crawl:news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 7 --output-file $OUTPUT_FOLDER/topic-08/news-list.json --print-format json
      - [Sub Process] python news_crawler.py news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 7 --output-file $OUTPUT_FOLDER/topic-08/news-list.json --print-format json
        or node --experimental-strip-types news-crawler.ts news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 7 --output-file $OUTPUT_FOLDER/topic-08/news-list.json --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-08/news-list.json
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "topic-index": 7,
          "total-news-list": {TOTAL_NEWS_LIST},
          "output-file": "$OUTPUT_FOLDER/topic-08/news-list.json"
        }
    - [Sub Process] pnpm -F @ai-newscast/news-crawler crawl:news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 8 --output-file $OUTPUT_FOLDER/topic-09/news-list.json --print-format json
      - [Sub Process] python news_crawler.py news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 8 --output-file $OUTPUT_FOLDER/topic-09/news-list.json --print-format json
        or node --experimental-strip-types news-crawler.ts news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 8 --output-file $OUTPUT_FOLDER/topic-09/news-list.json --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-09/news-list.json
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "topic-index": 8,
          "total-news-list": {TOTAL_NEWS_LIST},
          "output-file": "$OUTPUT_FOLDER/topic-09/news-list.json"
        }
    - [Sub Process] pnpm -F @ai-newscast/news-crawler crawl:news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 9 --output-file $OUTPUT_FOLDER/topic-10/news-list.json --print-format json
      - [Sub Process] python news_crawler.py news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 9 --output-file $OUTPUT_FOLDER/topic-10/news-list.json --print-format json
        or node --experimental-strip-types news-crawler.ts news-list --input-file $OUTPUT_FOLDER/topic-list.json --topic-index 9 --output-file $OUTPUT_FOLDER/topic-10/news-list.json --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-10/news-list.json
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "topic-index": 9,
          "total-news-list": {TOTAL_NEWS_LIST},
          "output-file": "$OUTPUT_FOLDER/topic-10/news-list.json"
        }
    - [Output Text] {
      "timestamp": "{ISO_TIMESTAMP}",
      "elapsed-time": "{ELAPSED_TIME}",
      "total-news-list": {TOTAL_NEWS_LIST},
      "output-files": [
        "$OUTPUT_FOLDER/topic-01/news-list.json",
        "$OUTPUT_FOLDER/topic-02/news-list.json",
        "$OUTPUT_FOLDER/topic-03/news-list.json",
        "$OUTPUT_FOLDER/topic-04/news-list.json",
        "$OUTPUT_FOLDER/topic-05/news-list.json",
        "$OUTPUT_FOLDER/topic-06/news-list.json",
        "$OUTPUT_FOLDER/topic-07/news-list.json",
        "$OUTPUT_FOLDER/topic-08/news-list.json",
        "$OUTPUT_FOLDER/topic-09/news-list.json",
        "$OUTPUT_FOLDER/topic-10/news-list.json"
      ]
    }

[Command] OUTPUT_FOLDER=$(realpath output/{ISO_TIMESTAMP}) pnpm run:crawler:news-details -- $(printf '--input-file %s\n' $OUTPUT_FOLDER/topic-*/news-list.json) --output-folder $OUTPUT_FOLDER --print-format json
- [Sub Process] turbo crawler:news-details $(printf '--input-file %s\n' $OUTPUT_FOLDER/topic-*/news-list.json) --output-folder $OUTPUT_FOLDER --print-format json
  - [Sub Process] pnpm -F @ai-newscast/news-crawler crawl:news-details $(printf '--input-file %s\n' $OUTPUT_FOLDER/topic-*/news-list.json) --output-folder $OUTPUT_FOLDER --print-format json
    - [Sub Process] python news_crawler.py news-details --input-file $OUTPUT_FOLDER/topic-01/news-list.json --output-folder $OUTPUT_FOLDER/topic-01/news --print-format json
      or node --experimental-strip-types news-crawler.ts news-details --input-file $OUTPUT_FOLDER/topic-01/news-list.json --output-folder $OUTPUT_FOLDER/topic-01/news --print-format json
      - [Output File] $OUTPUT_FOLDER/topic-01/news/{NEWS_ID[0]}.json
      - [Output File] $OUTPUT_FOLDER/topic-01/news/{NEWS_ID[1]}.json
      - [Output File] $OUTPUT_FOLDER/topic-01/news/{NEWS_ID[2]}.json
      - ...
      - [Output File] $OUTPUT_FOLDER/topic-01/news/{NEWS_ID[n]}.json
      - [Output Text] {
        "timestamp": "{ISO_TIMESTAMP}",
        "elapsed-time": "{ELAPSED_TIME}",
        "total-news-details": {TOTAL_NEWS_DETAILS},
        "output-files": [
          "$OUTPUT_FOLDER/topic-01/news/{NEWS_ID[0]}.json",
          "$OUTPUT_FOLDER/topic-01/news/{NEWS_ID[1]}.json",
          "$OUTPUT_FOLDER/topic-01/news/{NEWS_ID[2]}.json",
          ...
          "$OUTPUT_FOLDER/topic-01/news/{NEWS_ID[n]}.json"
        ]
      }
    - [Sub Process] python news_crawler.py news-details --input-file $OUTPUT_FOLDER/topic-02/news-list.json --output-folder $OUTPUT_FOLDER/topic-02/news --print-format json
      or node --experimental-strip-types news-crawler.ts news-details --input-file $OUTPUT_FOLDER/topic-02/news-list.json --output-folder $OUTPUT_FOLDER/topic-02/news --print-format json
      - [Output File] $OUTPUT_FOLDER/topic-02/news/{NEWS_ID[0]}.json
      - [Output File] $OUTPUT_FOLDER/topic-02/news/{NEWS_ID[1]}.json
      - [Output File] $OUTPUT_FOLDER/topic-02/news/{NEWS_ID[2]}.json
      - ...
      - [Output File] $OUTPUT_FOLDER/topic-02/news/{NEWS_ID[n]}.json
      - [Output Text] {
        "timestamp": "{ISO_TIMESTAMP}",
        "elapsed-time": "{ELAPSED_TIME}",
        "total-news-details": {TOTAL_NEWS_DETAILS},
        "output-files": [
          "$OUTPUT_FOLDER/topic-02/news/{NEWS_ID[0]}.json",
          "$OUTPUT_FOLDER/topic-02/news/{NEWS_ID[1]}.json",
          "$OUTPUT_FOLDER/topic-02/news/{NEWS_ID[2]}.json",
          ...
          "$OUTPUT_FOLDER/topic-02/news/{NEWS_ID[n]}.json"
        ]
      }
    - [Sub Process] python news_crawler.py news-details --input-file $OUTPUT_FOLDER/topic-03/news-list.json --output-folder $OUTPUT_FOLDER/topic-03/news --print-format json
      or node --experimental-strip-types news-crawler.ts news-details --input-file $OUTPUT_FOLDER/topic-03/news-list.json --output-folder $OUTPUT_FOLDER/topic-03/news --print-format json
      - [Output File] $OUTPUT_FOLDER/topic-03/news/{NEWS_ID[0]}.json
      - [Output File] $OUTPUT_FOLDER/topic-03/news/{NEWS_ID[1]}.json
      - [Output File] $OUTPUT_FOLDER/topic-03/news/{NEWS_ID[2]}.json
      - ...
      - [Output File] $OUTPUT_FOLDER/topic-03/news/{NEWS_ID[n]}.json
      - [Output Text] {
        "timestamp": "{ISO_TIMESTAMP}",
        "elapsed-time": "{ELAPSED_TIME}",
        "total-news-details": {TOTAL_NEWS_DETAILS},
        "output-files": [
          "$OUTPUT_FOLDER/topic-03/news/{NEWS_ID[0]}.json",
          "$OUTPUT_FOLDER/topic-03/news/{NEWS_ID[1]}.json",
          "$OUTPUT_FOLDER/topic-03/news/{NEWS_ID[2]}.json",
          ...
          "$OUTPUT_FOLDER/topic-03/news/{NEWS_ID[n]}.json"
        ]
      }
    - ...
    - [Sub Process] python news_crawler.py news-details --input-file $OUTPUT_FOLDER/topic-04/news-list.json --output-folder $OUTPUT_FOLDER/topic-10/news --print-format json
      or node --experimental-strip-types news-crawler.ts news-details --input-file $OUTPUT_FOLDER/topic-04/news-list.json --output-folder $OUTPUT_FOLDER/topic-10/news --print-format json
      - [Output File] $OUTPUT_FOLDER/topic-10/news/{NEWS_ID[0]}.json
      - [Output File] $OUTPUT_FOLDER/topic-10/news/{NEWS_ID[1]}.json
      - [Output File] $OUTPUT_FOLDER/topic-10/news/{NEWS_ID[2]}.json
      - ...
      - [Output File] $OUTPUT_FOLDER/topic-10/news/{NEWS_ID[n]}.json
      - [Output Text] {
        "timestamp": "{ISO_TIMESTAMP}",
        "elapsed-time": "{ELAPSED_TIME}",
        "total-news-details": {TOTAL_NEWS_DETAILS},
        "output-files": [
          "$OUTPUT_FOLDER/topic-10/news/{NEWS_ID[0]}.json",
          "$OUTPUT_FOLDER/topic-10/news/{NEWS_ID[1]}.json",
          "$OUTPUT_FOLDER/topic-10/news/{NEWS_ID[2]}.json",
          ...
          "$OUTPUT_FOLDER/topic-10/news/{NEWS_ID[n]}.json"
        ]
      }
    - [Output Text] {
      "timestamp": "{ISO_TIMESTAMP}",
      "elapsed-time": "{ELAPSED_TIME}",
      "total-news-details": {
        "total": {TOTAL_NEWS_DETAILS},
        "topics": [
          {
            "index": 0,
            "total": {TOTAL_NEWS_DETAILS[0]}
          },
          {
            "index": 1,
            "total": {TOTAL_NEWS_DETAILS[1]}
          },
          {
            "index": 2,
            "total": {TOTAL_NEWS_DETAILS[2]}
          },
          ...
          {
            "index": 9,
            "total": {TOTAL_NEWS_DETAILS[9]}
          }
        ]
      },
      "output-files": [
        [
          "$OUTPUT_FOLDER/topic-01/news/{NEWS_ID[0]}.json",
          "$OUTPUT_FOLDER/topic-01/news/{NEWS_ID[1]}.json",
          "$OUTPUT_FOLDER/topic-01/news/{NEWS_ID[2]}.json",
          ...
          "$OUTPUT_FOLDER/topic-01/news/{NEWS_ID[n]}.json"
        ],
        [
          "$OUTPUT_FOLDER/topic-02/news/{NEWS_ID[0]}.json",
          "$OUTPUT_FOLDER/topic-02/news/{NEWS_ID[1]}.json",
          "$OUTPUT_FOLDER/topic-02/news/{NEWS_ID[2]}.json",
          ...
          "$OUTPUT_FOLDER/topic-02/news/{NEWS_ID[n]}.json"
        ],
        [
          "$OUTPUT_FOLDER/topic-03/news/{NEWS_ID[0]}.json",
          "$OUTPUT_FOLDER/topic-03/news/{NEWS_ID[1]}.json",
          "$OUTPUT_FOLDER/topic-03/news/{NEWS_ID[2]}.json",
          ...
          "$OUTPUT_FOLDER/topic-03/news/{NEWS_ID[n]}.json"
        ],
        ...
        [
          "$OUTPUT_FOLDER/topic-10/news/{NEWS_ID[0]}.json",
          "$OUTPUT_FOLDER/topic-10/news/{NEWS_ID[1]}.json",
          "$OUTPUT_FOLDER/topic-10/news/{NEWS_ID[2]}.json",
          ...
          "$OUTPUT_FOLDER/topic-10/news/{NEWS_ID[n]}.json"
        ]
      ]
    }

[Command] OUTPUT_FOLDER=$(realpath output/{ISO_TIMESTAMP}) GOOGLE_GENAI_API_KEY=$(cat .env | grep GOOGLE_GENAI_API_KEY | cut -d '=' -f 2) pnpm run:generator:news -- $(printf '--input-folder %s\n' $OUTPUT_FOLDER/topic-*/news) --output-folder $OUTPUT_FOLDER --print-format json
- [Sub Process] turbo generator:news $(printf '--input-folder %s\n' $OUTPUT_FOLDER/topic-*/news) --output-folder $OUTPUT_FOLDER --print-format json
  - [Sub Process] pnpm -F @ai-newscast/news-generator generate $(printf '--input-file %s\n' $OUTPUT_FOLDER/topic-01/news/*.json) --output-file $OUTPUT_FOLDER/topic-01/news.json --print-format json
    - [Sub Process] node --experimental-strip-types news-generator.ts --input-file $OUTPUT_FOLDER/topic-01/news/{NEWS_ID[0]}.json --input-file $OUTPUT_FOLDER/topic-01/news/{NEWS_ID[1]}.json --input-file $OUTPUT_FOLDER/topic-01/news/{NEWS_ID[2]}.json ... --input-file $OUTPUT_FOLDER/topic-01/news/{NEWS_ID[n]}.json --output-file $OUTPUT_FOLDER/topic-01/news.json --print-format json
      - [Output File] $OUTPUT_FOLDER/topic-01/news.json
      - [Output File] $OUTPUT_FOLDER/topic-01/news.txt
      - [Output Text] {
        "timestamp": "{ISO_TIMESTAMP}",
        "elapsed-time": "{ELAPSED_TIME}",
        "total-news-list": {TOTAL_NEWS_LIST},
        "output-file": "$OUTPUT_FOLDER/topic-01/news.json"
      }
    - [Sub Process] node --experimental-strip-types news-generator.ts --input-file $OUTPUT_FOLDER/topic-02/news/{NEWS_ID[0]}.json --input-file $OUTPUT_FOLDER/topic-02/news/{NEWS_ID[1]}.json --input-file $OUTPUT_FOLDER/topic-02/news/{NEWS_ID[2]}.json ... --input-file $OUTPUT_FOLDER/topic-02/news/{NEWS_ID[n]}.json --output-file $OUTPUT_FOLDER/topic-02/news.json --print-format json
      - [Output File] $OUTPUT_FOLDER/topic-02/news.json
      - [Output File] $OUTPUT_FOLDER/topic-02/news.txt
      - [Output Text] {
        "timestamp": "{ISO_TIMESTAMP}",
        "elapsed-time": "{ELAPSED_TIME}",
        "total-news-list": {TOTAL_NEWS_LIST},
        "output-file": "$OUTPUT_FOLDER/topic-02/news.json"
      }
    - [Sub Process] node --experimental-strip-types news-generator.ts --input-file $OUTPUT_FOLDER/topic-03/news/{NEWS_ID[0]}.json --input-file $OUTPUT_FOLDER/topic-03/news/{NEWS_ID[1]}.json --input-file $OUTPUT_FOLDER/topic-03/news/{NEWS_ID[2]}.json ... --input-file $OUTPUT_FOLDER/topic-03/news/{NEWS_ID[n]}.json --output-file $OUTPUT_FOLDER/topic-03/news.json --print-format json
      - [Output File] $OUTPUT_FOLDER/topic-03/news.json
      - [Output File] $OUTPUT_FOLDER/topic-03/news.txt
      - [Output Text] {
        "timestamp": "{ISO_TIMESTAMP}",
        "elapsed-time": "{ELAPSED_TIME}",
        "total-news-list": {TOTAL_NEWS_LIST},
        "output-file": "$OUTPUT_FOLDER/topic-03/news.json"
      }
    - ...
    - [Sub Process] node --experimental-strip-types news-generator.ts --input-file $OUTPUT_FOLDER/topic-10/news/{NEWS_ID[0]}.json --input-file $OUTPUT_FOLDER/topic-10/news/{NEWS_ID[1]}.json --input-file $OUTPUT_FOLDER/topic-10/news/{NEWS_ID[2]}.json ... --input-file $OUTPUT_FOLDER/topic-10/news/{NEWS_ID[n]}.json --output-file $OUTPUT_FOLDER/topic-10/news.json --print-format json
      - [Output File] $OUTPUT_FOLDER/topic-10/news.json
      - [Output File] $OUTPUT_FOLDER/topic-10/news.txt
      - [Output Text] {
        "timestamp": "{ISO_TIMESTAMP}",
        "elapsed-time": "{ELAPSED_TIME}",
        "total-news-list": {TOTAL_NEWS_LIST},
        "output-file": "$OUTPUT_FOLDER/topic-10/news.json"
      }
    - [Output Text] {
      "timestamp": "{ISO_TIMESTAMP}",
      "total-news": {TOTAL_NEWS},
      "output-files": [
        "$OUTPUT_FOLDER/topic-01/news.json",
        "$OUTPUT_FOLDER/topic-02/news.json",
        "$OUTPUT_FOLDER/topic-03/news.json",
        ...
        "$OUTPUT_FOLDER/topic-10/news.json"
      ]
    }

[Command] OUTPUT_FOLDER=$(realpath output/{ISO_TIMESTAMP}) GOOGLE_GENAI_API_KEY=$(cat .env | grep GOOGLE_GENAI_API_KEY | cut -d '=' -f 2) pnpm run:generator:newscast-script -- $(printf '--input-file %s\n' $OUTPUT_FOLDER/topic-*/news.json) --output-folder $OUTPUT_FOLDER --print-format json
- [Sub Process] turbo generator:newscast-script $(printf '--input-file %s\n' $OUTPUT_FOLDER/topic-*/news.json) --output-folder $OUTPUT_FOLDER --print-format json
  - [Sub Process] pnpm -F @ai-newscast/newscast-generator generate:script $(printf '--input-file %s\n' $OUTPUT_FOLDER/topic-*/news.json) --output-folder $OUTPUT_FOLDER --print-format json
    - [Sub Process] pnpm -F @ai-newscast/newscast-generator generate:script --input-file $OUTPUT_FOLDER/topic-01/news.json --output-file $OUTPUT_FOLDER/topic-01/newscast-script.json --print-format json
      - [Sub Process] node --experimental-strip-types newscast-generator.ts script --input-file $OUTPUT_FOLDER/topic-01/news.json --output-file $OUTPUT_FOLDER/topic-01/newscast-script.json --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-01/newscast-script.json
        - [Output File] $OUTPUT_FOLDER/topic-01/newscast-script.txt
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "output-file": "$OUTPUT_FOLDER/topic-01/newscast-script.json"
        }
    - [Sub Process] pnpm -F @ai-newscast/newscast-generator generate:script --input-file $OUTPUT_FOLDER/topic-02/news.json --output-file $OUTPUT_FOLDER/topic-02/newscast-script.json --print-format json
      - [Sub Process] node --experimental-strip-types newscast-generator.ts script --input-file $OUTPUT_FOLDER/topic-02/news.json --output-file $OUTPUT_FOLDER/topic-02/newscast-script.json --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-02/newscast-script.json
        - [Output File] $OUTPUT_FOLDER/topic-02/newscast-script.txt
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "output-file": "$OUTPUT_FOLDER/topic-02/newscast-script.json"
        }
    - [Sub Process] pnpm -F @ai-newscast/newscast-generator generate:script --input-file $OUTPUT_FOLDER/topic-03/news.json --output-file $OUTPUT_FOLDER/topic-03/newscast-script.json --print-format json
      - [Sub Process] node --experimental-strip-types newscast-generator.ts script --input-file $OUTPUT_FOLDER/topic-03/news.json --output-file $OUTPUT_FOLDER/topic-03/newscast-script.json --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-03/newscast-script.json
        - [Output File] $OUTPUT_FOLDER/topic-03/newscast-script.txt
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "output-file": "$OUTPUT_FOLDER/topic-03/newscast-script.json"
        }
    - ...
    - [Sub Process] pnpm -F @ai-newscast/newscast-generator generate:script --input-file $OUTPUT_FOLDER/topic-10/news.json --output-file $OUTPUT_FOLDER/topic-10/newscast-script.json --print-format json
      - [Sub Process] node --experimental-strip-types newscast-generator.ts script --input-file $OUTPUT_FOLDER/topic-10/news.json --output-file $OUTPUT_FOLDER/topic-10/newscast-script.json --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-10/newscast-script.json
        - [Output File] $OUTPUT_FOLDER/topic-10/newscast-script.txt
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "output-file": "$OUTPUT_FOLDER/topic-10/newscast-script.json"
        }
    - [Output Text] {
      "timestamp": "{ISO_TIMESTAMP}",
      "elapsed-time": "{ELAPSED_TIME}",
      "total-news": {TOTAL_NEWS},
      "output-files": [
        "$OUTPUT_FOLDER/topic-01/newscast-script.json",
        "$OUTPUT_FOLDER/topic-02/newscast-script.json",
        "$OUTPUT_FOLDER/topic-03/newscast-script.json",
        ...
        "$OUTPUT_FOLDER/topic-10/newscast-script.json"
      ]
    }

[Command] OUTPUT_FOLDER=$(realpath output/{ISO_TIMESTAMP}) GOOGLE_GENAI_API_KEY=$(cat .env | grep GOOGLE_GENAI_API_KEY | cut -d '=' -f 2) pnpm run:generator:newscast-audio -- $(printf '--input-file %s\n' $OUTPUT_FOLDER/topic-*/newscast-script.json) --output-folder $OUTPUT_FOLDER --print-format json
- [Sub Process] turbo generator:newscast-audio $(printf '--input-file %s\n' $OUTPUT_FOLDER/topic-*/newscast-script.json) --output-folder $OUTPUT_FOLDER --print-format json
  - [Sub Process] pnpm -F @ai-newscast/newscast-generator generate:audio $(printf '--input-file %s\n' $OUTPUT_FOLDER/topic-*/newscast-script.json) --output-folder $OUTPUT_FOLDER --print-format json
    - [Sub Process] pnpm -F @ai-newscast/newscast-generator generate:audio --input-file $OUTPUT_FOLDER/topic-01/newscast-script.json --output-folder $OUTPUT_FOLDER/topic-01/audio --print-format json
      - [Sub Process] node --experimental-strip-types newscast-generator.ts audio --input-file $OUTPUT_FOLDER/topic-01/newscast-script.json --output-folder $OUTPUT_FOLDER/topic-01/audio --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-01/audio/001-{MODEL_NAME_1}.mp3
        - [Output File] $OUTPUT_FOLDER/topic-01/audio/002-{MODEL_NAME_2}.mp3
        - [Output File] $OUTPUT_FOLDER/topic-01/audio/003-{MODEL_NAME_1}.mp3
        - [Output File] $OUTPUT_FOLDER/topic-01/audio/004-{MODEL_NAME_2}.mp3
        - [Output File] $OUTPUT_FOLDER/topic-01/audio/005-{MODEL_NAME_1}.mp3
        - ...
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "total-newscast-audio": {TOTAL_NEWSCAST_AUDIO},
          "output-files": [
            "$OUTPUT_FOLDER/topic-01/audio/001-{MODEL_NAME_1}.mp3",
            "$OUTPUT_FOLDER/topic-01/audio/002-{MODEL_NAME_2}.mp3",
            "$OUTPUT_FOLDER/topic-01/audio/003-{MODEL_NAME_1}.mp3",
            "$OUTPUT_FOLDER/topic-01/audio/004-{MODEL_NAME_2}.mp3",
            "$OUTPUT_FOLDER/topic-01/audio/005-{MODEL_NAME_1}.mp3",
            ...
          ]
        }
    - [Sub Process] pnpm -F @ai-newscast/newscast-generator generate:audio --input-file $OUTPUT_FOLDER/topic-02/newscast-script.json --output-folder $OUTPUT_FOLDER/topic-02/audio --print-format json
      - [Sub Process] node --experimental-strip-types newscast-generator.ts audio --input-file $OUTPUT_FOLDER/topic-02/newscast-script.json --output-folder $OUTPUT_FOLDER/topic-02/audio --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-02/audio/001-{MODEL_NAME_1}.mp3
        - [Output File] $OUTPUT_FOLDER/topic-02/audio/002-{MODEL_NAME_2}.mp3
        - [Output File] $OUTPUT_FOLDER/topic-02/audio/003-{MODEL_NAME_1}.mp3
        - [Output File] $OUTPUT_FOLDER/topic-02/audio/004-{MODEL_NAME_2}.mp3
        - [Output File] $OUTPUT_FOLDER/topic-02/audio/005-{MODEL_NAME_1}.mp3
        - ...
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "total-newscast-audio": {TOTAL_NEWSCAST_AUDIO},
          "output-files": [
            "$OUTPUT_FOLDER/topic-02/audio/001-{MODEL_NAME_1}.mp3",
            "$OUTPUT_FOLDER/topic-02/audio/002-{MODEL_NAME_2}.mp3",
            "$OUTPUT_FOLDER/topic-02/audio/003-{MODEL_NAME_1}.mp3",
            "$OUTPUT_FOLDER/topic-02/audio/004-{MODEL_NAME_2}.mp3",
            "$OUTPUT_FOLDER/topic-02/audio/005-{MODEL_NAME_1}.mp3",
            ...
          ]
        }
    - [Sub Process] pnpm -F @ai-newscast/newscast-generator generate:audio --input-file $OUTPUT_FOLDER/topic-03/newscast-script.json --output-folder $OUTPUT_FOLDER/topic-03/audio --print-format json
      - [Sub Process] node --experimental-strip-types newscast-generator.ts audio --input-file $OUTPUT_FOLDER/topic-03/newscast-script.json --output-folder $OUTPUT_FOLDER/topic-03/audio --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-03/audio/001-{MODEL_NAME_1}.mp3
        - [Output File] $OUTPUT_FOLDER/topic-03/audio/002-{MODEL_NAME_2}.mp3
        - [Output File] $OUTPUT_FOLDER/topic-03/audio/003-{MODEL_NAME_1}.mp3
        - [Output File] $OUTPUT_FOLDER/topic-03/audio/004-{MODEL_NAME_2}.mp3
        - [Output File] $OUTPUT_FOLDER/topic-03/audio/005-{MODEL_NAME_1}.mp3
        - ...
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "total-newscast-audio": {TOTAL_NEWSCAST_AUDIO},
          "output-files": [
            "$OUTPUT_FOLDER/topic-03/audio/001-{MODEL_NAME_1}.mp3",
            "$OUTPUT_FOLDER/topic-03/audio/002-{MODEL_NAME_2}.mp3",
            "$OUTPUT_FOLDER/topic-03/audio/003-{MODEL_NAME_1}.mp3",
            "$OUTPUT_FOLDER/topic-03/audio/004-{MODEL_NAME_2}.mp3",
            "$OUTPUT_FOLDER/topic-03/audio/005-{MODEL_NAME_1}.mp3",
            ...
          ]
        }
    - ...
    - [Sub Process] pnpm -F @ai-newscast/newscast-generator generate:audio --input-file $OUTPUT_FOLDER/topic-10/newscast-script.json --output-folder $OUTPUT_FOLDER/topic-10/audio --print-format json
      - [Sub Process] node --experimental-strip-types newscast-generator.ts audio --input-file $OUTPUT_FOLDER/topic-10/newscast-script.json --output-folder $OUTPUT_FOLDER/topic-10/audio --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-10/audio/001-{MODEL_NAME_1}.mp3
        - [Output File] $OUTPUT_FOLDER/topic-10/audio/002-{MODEL_NAME_2}.mp3
        - [Output File] $OUTPUT_FOLDER/topic-10/audio/003-{MODEL_NAME_1}.mp3
        - [Output File] $OUTPUT_FOLDER/topic-10/audio/004-{MODEL_NAME_2}.mp3
        - [Output File] $OUTPUT_FOLDER/topic-10/audio/005-{MODEL_NAME_1}.mp3
        - ...
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "total-newscast-audio": {TOTAL_NEWSCAST_AUDIO},
          "output-files": [
            "$OUTPUT_FOLDER/topic-10/audio/001-{MODEL_NAME_1}.mp3",
            "$OUTPUT_FOLDER/topic-10/audio/002-{MODEL_NAME_2}.mp3",
            "$OUTPUT_FOLDER/topic-10/audio/003-{MODEL_NAME_1}.mp3",
            "$OUTPUT_FOLDER/topic-10/audio/004-{MODEL_NAME_2}.mp3",
            "$OUTPUT_FOLDER/topic-10/audio/005-{MODEL_NAME_1}.mp3",
            ...
          ]
        }
    - [Output Text] {
      "timestamp": "{ISO_TIMESTAMP}",
      "elapsed-time": "{ELAPSED_TIME}",
      "total-newscast-audio": {
        "total": {TOTAL_NEWSCAST_AUDIO},
        "topics": [
          {
            "index": 0,
            "total": {TOTAL_NEWSCAST_AUDIO[0]}
          },
          {
            "index": 1,
            "total": {TOTAL_NEWSCAST_AUDIO[1]}
          },
          {
            "index": 2,
            "total": {TOTAL_NEWSCAST_AUDIO[2]}
          },
          ...
          {
            "index": 9,
            "total": {TOTAL_NEWSCAST_AUDIO[9]}
          }
        ]
      },
      "output-files": [
        [
          "$OUTPUT_FOLDER/topic-01/audio/001-{MODEL_NAME_1}.mp3",
          "$OUTPUT_FOLDER/topic-01/audio/002-{MODEL_NAME_2}.mp3",
          "$OUTPUT_FOLDER/topic-01/audio/003-{MODEL_NAME_1}.mp3",
          "$OUTPUT_FOLDER/topic-01/audio/004-{MODEL_NAME_2}.mp3",
          "$OUTPUT_FOLDER/topic-01/audio/005-{MODEL_NAME_1}.mp3",
          ...
        ],
        [
          "$OUTPUT_FOLDER/topic-02/audio/001-{MODEL_NAME_1}.mp3",
          "$OUTPUT_FOLDER/topic-02/audio/002-{MODEL_NAME_2}.mp3",
          "$OUTPUT_FOLDER/topic-02/audio/003-{MODEL_NAME_1}.mp3",
          "$OUTPUT_FOLDER/topic-02/audio/004-{MODEL_NAME_2}.mp3",
          "$OUTPUT_FOLDER/topic-02/audio/005-{MODEL_NAME_1}.mp3",
          ...
        ],
        [
          "$OUTPUT_FOLDER/topic-03/audio/001-{MODEL_NAME_1}.mp3",
          "$OUTPUT_FOLDER/topic-03/audio/002-{MODEL_NAME_2}.mp3",
          "$OUTPUT_FOLDER/topic-03/audio/003-{MODEL_NAME_1}.mp3",
          "$OUTPUT_FOLDER/topic-03/audio/004-{MODEL_NAME_2}.mp3",
          "$OUTPUT_FOLDER/topic-03/audio/005-{MODEL_NAME_1}.mp3",
          ...
        ],
        ...
        [
          "$OUTPUT_FOLDER/topic-10/audio/001-{MODEL_NAME_1}.mp3",
          "$OUTPUT_FOLDER/topic-10/audio/002-{MODEL_NAME_2}.mp3",
          "$OUTPUT_FOLDER/topic-10/audio/003-{MODEL_NAME_1}.mp3",
          "$OUTPUT_FOLDER/topic-10/audio/004-{MODEL_NAME_2}.mp3",
          "$OUTPUT_FOLDER/topic-10/audio/005-{MODEL_NAME_1}.mp3",
          ...
        ]
      ]
    }

[Command] OUTPUT_FOLDER=$(realpath output/{ISO_TIMESTAMP}) pnpm run:generator:newscast -- $(printf '--input-folder %s\n' $OUTPUT_FOLDER/topic-*/audio) --output-folder $OUTPUT_FOLDER --print-format json
- [Sub Process] turbo generator:newscast $(printf '--input-folder %s\n' $OUTPUT_FOLDER/topic-*/audio) --output-folder $OUTPUT_FOLDER --print-format json
  - [Sub Process] pnpm -F @ai-newscast/newscast-generator generate:newscast $(printf '--input-folder %s\n' $OUTPUT_FOLDER/topic-*/audio) --output-folder $OUTPUT_FOLDER --print-format json
    - [Sub Process] pnpm -F @ai-newscast/newscast-generator generate:newscast $(printf '--input-file %s\n' $OUTPUT_FOLDER/topic-01/audio/*.mp3) --output-file $OUTPUT_FOLDER/topic-01/newscast.mp3 --print-format json
      - [Sub Process] node --experimental-strip-types newscast-generator.ts newscast --input-file $OUTPUT_FOLDER/topic-01/audio/*.mp3 --output-file $OUTPUT_FOLDER/topic-01/newscast.mp3 --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-01/newscast.mp3
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "output-file": "$OUTPUT_FOLDER/topic-01/newscast.mp3"
        }
    - [Sub Process] pnpm -F @ai-newscast/newscast-generator generate:newscast $(printf '--input-file %s\n' $OUTPUT_FOLDER/topic-02/audio/*.mp3) --output-file $OUTPUT_FOLDER/topic-02/newscast.mp3 --print-format json
      - [Sub Process] node --experimental-strip-types newscast-generator.ts newscast --input-file $OUTPUT_FOLDER/topic-02/audio/*.mp3 --output-file $OUTPUT_FOLDER/topic-02/newscast.mp3 --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-02/newscast.mp3
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "output-file": "$OUTPUT_FOLDER/topic-02/newscast.mp3"
        }
    - [Sub Process] pnpm -F @ai-newscast/newscast-generator generate:newscast $(printf '--input-file %s\n' $OUTPUT_FOLDER/topic-03/audio/*.mp3) --output-file $OUTPUT_FOLDER/topic-03/newscast.mp3 --print-format json
      - [Sub Process] node --experimental-strip-types newscast-generator.ts newscast --input-file $OUTPUT_FOLDER/topic-03/audio/*.mp3 --output-file $OUTPUT_FOLDER/topic-03/newscast.mp3 --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-03/newscast.mp3
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "output-file": "$OUTPUT_FOLDER/topic-03/newscast.mp3"
        }
    - ...
    - [Sub Process] pnpm -F @ai-newscast/newscast-generator generate:newscast $(printf '--input-file %s\n' $OUTPUT_FOLDER/topic-10/audio/*.mp3) --output-file $OUTPUT_FOLDER/topic-10/newscast.mp3 --print-format json
      - [Sub Process] node --experimental-strip-types newscast-generator.ts newscast --input-file $OUTPUT_FOLDER/topic-10/audio/*.mp3 --output-file $OUTPUT_FOLDER/topic-10/newscast.mp3 --print-format json
        - [Output File] $OUTPUT_FOLDER/topic-10/newscast.mp3
        - [Output Text] {
          "timestamp": "{ISO_TIMESTAMP}",
          "elapsed-time": "{ELAPSED_TIME}",
          "output-file": "$OUTPUT_FOLDER/topic-10/newscast.mp3"
        }
    - [Output Text] {
      "timestamp": "{ISO_TIMESTAMP}",
      "elapsed-time": "{ELAPSED_TIME}",
      "output-files": [
        "$OUTPUT_FOLDER/topic-01/newscast.mp3",
        "$OUTPUT_FOLDER/topic-02/newscast.mp3",
        "$OUTPUT_FOLDER/topic-03/newscast.mp3",
        "$OUTPUT_FOLDER/topic-04/newscast.mp3",
        "$OUTPUT_FOLDER/topic-05/newscast.mp3",
        ...
        "$OUTPUT_FOLDER/topic-10/newscast.mp3"
      ]
    }

[Command] pnpm update:latest-list-id -- {ISO_TIMESTAMP}
- [Sub Process] turbo update:latest-list-id -- {ISO_TIMESTAMP}
  - [Sub Process] pnpm -F @ai-newscast/latest-list-id update {ISO_TIMESTAMP}
    - [Sub Process] wrangler kv key put --namespace-id ai-newscast-kv latiest-list-id {ISO_TIMESTAMP}
```

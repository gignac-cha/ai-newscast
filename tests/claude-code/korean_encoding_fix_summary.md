# Korean Text Encoding Issue Analysis and Fix

## Problem Description
The bigkinds extraction script was producing garbled Korean text like "ì´ì¬ëª" instead of proper Korean characters like "이재명".

## Root Cause Analysis
The issue was in how the HTML content was being parsed by lxml. When using `etree.HTML(response.content)` with raw bytes, lxml was not properly handling the UTF-8 encoding of Korean characters.

### Technical Details
1. **Raw bytes in response.content**: `b'\xec\x9d\xb4\xec\x9e\xac\xeb\xaa\x85'` (UTF-8 encoded Korean)
2. **When parsed with `etree.HTML(response.content)`**: Produced garbled text "ì´ì¬ëª"
3. **When parsed with `etree.HTML(response.text)`**: Produced correct text "이재명"

The difference is that `response.text` is already decoded as a Unicode string, while `response.content` contains raw bytes that need proper encoding handling.

## Solution Implemented

### 1. Fixed HTML Parsing
**Before:**
```python
root = etree.HTML(response.content)  # ❌ Causes encoding issues
```

**After:**
```python
root = etree.HTML(response.text)  # ✅ Proper Unicode handling
```

### 2. Added HTML Entity Decoding
**Before:**
```python
topic_text = button.get("data-topic", "")  # ❌ Leaves &#039; as-is
```

**After:**
```python
topic_text = html.unescape(button.get("data-topic", ""))  # ✅ Converts &#039; to '
```

### 3. Applied to All Text Fields
The fix was applied to:
- `topic_text` (main topic title)
- `issue_name` (keyword string)
- `summary` (detailed summary text)

## Test Results

### Before Fix:
```
1. ì´ì¬ëª ëíµë ¹, íµì¼ë¶ ë± 5ê° ë¶ì² ì°¨ê´ê¸ ì¸ì¬ ë¨í
2. êµ­ì ì, &#039;ê³µì½ ì´í ê³í ë¶ì¤&#039;&#039; æª¢ ìë¬´ë³´ê³  ì¤ë¨
```

### After Fix:
```
1. 이재명 대통령, 통일부 등 5개 부처 차관급 인사 단행
2. 국정위, '공약 이행 계획 부실'' 檢 업무보고 중단
```

## Key Learnings

1. **Always use `response.text` for HTML parsing** when dealing with non-ASCII characters
2. **Add HTML entity decoding** to clean up HTML entities like `&#039;`
3. **Test with actual Korean content** to ensure encoding is working properly
4. **The response encoding detection** (`response.encoding = 'utf-8'`) was already correct, but the parsing method was the issue

## Code Changes Summary

### Files Modified:
- `/mnt/d/Projects/ai-newscast/tests/claude-code/bigkinds_topic_list.py`

### Key Changes:
1. Added `import html` for entity decoding
2. Changed `etree.HTML(response.content)` to `etree.HTML(response.text)`
3. Added `html.unescape()` calls for all text extraction
4. Added explanatory comments

This fix ensures that Korean text is properly extracted and preserved throughout the entire data processing pipeline.
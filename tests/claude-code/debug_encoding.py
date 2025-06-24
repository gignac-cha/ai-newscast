import requests
import urllib3
from lxml import etree
import html

urllib3.disable_warnings()

def test_encoding_approaches():
    """Test different encoding approaches to fix Korean text"""
    url = "https://bigkinds.or.kr/"
    
    response = requests.get(url, verify=False)
    response.raise_for_status()
    
    print("=== Response encoding info ===")
    print(f"Response encoding: {response.encoding}")
    print(f"Apparent encoding: {response.apparent_encoding}")
    print(f"Content-Type header: {response.headers.get('content-type', 'Not found')}")
    
    # Test different parsing approaches
    print("\n=== Testing different parsing approaches ===")
    
    # Approach 1: Current method (etree.HTML with response.content)
    print("\n1. Current method (etree.HTML with response.content):")
    root1 = etree.HTML(response.content)
    topic_buttons1 = root1.xpath('//a[@class="issupop-btn"]')
    if topic_buttons1:
        topic1 = topic_buttons1[0].get("data-topic", "")
        print(f"   Result: {topic1}")
    
    # Approach 2: etree.HTML with response.text (decoded string)
    print("\n2. etree.HTML with response.text (decoded string):")
    root2 = etree.HTML(response.text)
    topic_buttons2 = root2.xpath('//a[@class="issupop-btn"]')
    if topic_buttons2:
        topic2 = topic_buttons2[0].get("data-topic", "")
        print(f"   Result: {topic2}")
    
    # Approach 3: Force UTF-8 encoding on content
    print("\n3. Force UTF-8 encoding on content:")
    try:
        # Try to decode content as UTF-8
        content_utf8 = response.content.decode('utf-8')
        root3 = etree.HTML(content_utf8)
        topic_buttons3 = root3.xpath('//a[@class="issupop-btn"]')
        if topic_buttons3:
            topic3 = topic_buttons3[0].get("data-topic", "")
            print(f"   Result: {topic3}")
    except UnicodeDecodeError as e:
        print(f"   UTF-8 decode error: {e}")
    
    # Approach 4: Try different encodings
    encodings_to_try = ['utf-8', 'euc-kr', 'cp949', 'iso-8859-1']
    print("\n4. Testing different encodings:")
    for encoding in encodings_to_try:
        try:
            content_decoded = response.content.decode(encoding)
            root = etree.HTML(content_decoded)
            topic_buttons = root.xpath('//a[@class="issupop-btn"]')
            if topic_buttons:
                topic = topic_buttons[0].get("data-topic", "")
                print(f"   {encoding}: {topic}")
        except UnicodeDecodeError:
            print(f"   {encoding}: Failed to decode")
    
    # Approach 5: Use html parser instead of XML parser
    print("\n5. Using HTMLParser with proper encoding:")
    from lxml import html as lxml_html
    root5 = lxml_html.fromstring(response.content)
    topic_buttons5 = root5.xpath('//a[@class="issupop-btn"]')
    if topic_buttons5:
        topic5 = topic_buttons5[0].get("data-topic", "")
        print(f"   Result: {topic5}")
    
    # Approach 6: Check what's actually in the raw HTML
    print("\n6. Raw HTML content sample:")
    # Find the first data-topic in raw content
    content_str = response.text
    start_idx = content_str.find('data-topic="')
    if start_idx != -1:
        start_idx += len('data-topic="')
        end_idx = content_str.find('"', start_idx)
        if end_idx != -1:
            raw_topic = content_str[start_idx:end_idx]
            print(f"   Raw from response.text: {raw_topic}")
    
    # Also check raw bytes
    content_bytes = response.content
    start_idx_bytes = content_bytes.find(b'data-topic="')
    if start_idx_bytes != -1:
        start_idx_bytes += len(b'data-topic="')
        end_idx_bytes = content_bytes.find(b'"', start_idx_bytes)
        if end_idx_bytes != -1:
            raw_topic_bytes = content_bytes[start_idx_bytes:end_idx_bytes]
            print(f"   Raw bytes: {raw_topic_bytes}")
            try:
                print(f"   Raw bytes as UTF-8: {raw_topic_bytes.decode('utf-8')}")
            except:
                print("   Raw bytes UTF-8 decode failed")

if __name__ == "__main__":
    test_encoding_approaches()
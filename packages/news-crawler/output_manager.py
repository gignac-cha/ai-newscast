import json
import os

class OutputManager:
    """로깅 및 출력 관리 클래스"""
    
    def __init__(self, print_log_format='text', print_log_file=None):
        self.print_log_format = print_log_format
        self.print_log_file = print_log_file
    
    def info(self, message):
        """정보 메시지 출력 (JSON 모드가 아닐 때만)"""
        if self.print_log_format != 'json':
            print(message)
    
    def json_output(self, data):
        """JSON 형식으로 데이터 출력 및 파일 저장"""
        json_str = json.dumps(data, ensure_ascii=False, indent=2)
        
        if self.print_log_format == 'json':
            print(json_str)
        
        # Write to log file if specified
        if self.print_log_file:
            os.makedirs(os.path.dirname(self.print_log_file), exist_ok=True)
            with open(self.print_log_file, 'w', encoding='utf-8') as f:
                f.write(json_str)
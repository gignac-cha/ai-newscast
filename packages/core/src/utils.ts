import { promises as fs } from 'fs';
import { join } from 'path';

export class DateUtils {
  static getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  static getDateRange(days: number = 1): { startDate: string; endDate: string } {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    };
  }

  static formatTimestampForFolder(): string {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }
}

export class FileUtils {
  static async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  static async saveJson<T>(filePath: string, data: T): Promise<void> {
    await this.ensureDir(join(filePath, '..'));
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  static async loadJson<T>(filePath: string): Promise<T> {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  static async saveText(filePath: string, content: string): Promise<void> {
    await this.ensureDir(join(filePath, '..'));
    await fs.writeFile(filePath, content, 'utf-8');
  }

  static async pathExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}

export class HtmlUtils {
  static decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#039;': "'",
      '&#x27;': "'",
      '&#x2F;': '/',
      '&#x60;': '`',
      '&#x3D;': '=',
    };

    return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
  }

  static cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '')
      .replace(/[\r\n\t]/g, ' ');
  }
}

export class RetryUtils {
  static async withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          throw lastError;
        }

        await this.delay(delay * attempt);
      }
    }

    throw lastError!;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class ValidationUtils {
  static isValidNewsId(newsId: string): boolean {
    // BigKinds 뉴스 ID 형식: 숫자-날짜형식
    const pattern = /^\d{8}-\d{14}\d{3}$/;
    return pattern.test(newsId);
  }

  static convertNewsIdForApi(newsId: string): string {
    // API 호출시 하이픈을 점으로 변경
    return newsId.replace('-', '.');
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

export class Logger {
  private static formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  }

  static info(message: string): void {
    console.log(this.formatMessage('info', message));
  }

  static warn(message: string): void {
    console.warn(this.formatMessage('warn', message));
  }

  static error(message: string, error?: Error): void {
    console.error(this.formatMessage('error', message));
    if (error) {
      console.error(error.stack);
    }
  }

  static debug(message: string): void {
    if (process.env.DEBUG) {
      console.debug(this.formatMessage('debug', message));
    }
  }
}
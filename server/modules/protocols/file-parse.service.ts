import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as mammoth from 'mammoth';

@Injectable()
export class FileParseService {
  private readonly logger = new Logger(FileParseService.name);
  private readonly MAX_SIZE = 10 * 1024 * 1024;

  async parsePdf(buffer: Buffer): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const result = await pdfParse(buffer);
      return result.text || '';
    } catch (error) {
      this.logger.error(`PDF parse failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException('PDF 文件解析失败');
    }
  }

  async parseWord(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (error) {
      this.logger.error(`Word parse failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException('Word 文件解析失败');
    }
  }

  async parseFile(file: Express.Multer.File): Promise<{
    fileName: string;
    text: string;
    detectedLang: 'zh' | 'en';
  }> {
    if (!file) {
      throw new BadRequestException('未上传文件');
    }
    if (file.size > this.MAX_SIZE) {
      throw new BadRequestException('文件大小不能超过 10MB');
    }

    const originalName = file.originalname || '';
    const ext = originalName.toLowerCase().split('.').pop() || '';

    let text = '';
    if (ext === 'pdf') {
      text = await this.parsePdf(file.buffer);
    } else if (ext === 'doc' || ext === 'docx') {
      text = await this.parseWord(file.buffer);
    } else {
      throw new BadRequestException('不支持的文件格式，仅支持 PDF 和 Word (.doc/.docx)');
    }

    if (!text.trim()) {
      throw new BadRequestException('文件内容为空或无法提取文本');
    }

    const detectedLang = this.detectLang(text);

    return {
      fileName: originalName,
      text: text.slice(0, 20000),
      detectedLang,
    };
  }

  private detectLang(text: string): 'zh' | 'en' {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    return chineseChars > englishChars * 0.3 ? 'zh' : 'en';
  }
}

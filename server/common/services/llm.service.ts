import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  temperature?: number;
  responseFormat?: { type: string };
}

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);

  async chat(messages: ChatMessage[], options: ChatOptions): Promise<string> {
    const { apiBaseUrl, apiKey, modelName, temperature = 0.2, responseFormat } = options;

    if (!apiBaseUrl || !apiKey || !modelName) {
      throw new BadRequestException(
        'LLM 配置不完整：apiBaseUrl、apiKey、modelName 均为必填',
      );
    }

    const url = apiBaseUrl.endsWith('/')
      ? `${apiBaseUrl}chat/completions`
      : `${apiBaseUrl}/chat/completions`;

    try {
      const response = await axios.post(
        url,
        {
          model: modelName,
          messages,
          temperature,
          ...(responseFormat ? { response_format: responseFormat } : {}),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 60000,
        },
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('LLM 返回格式异常：缺少 choices[0].message.content');
      }
      return content;
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: unknown }; message?: string };
      const status = err.response?.status;
      const body = JSON.stringify(err.response?.data ?? {});
      const msg = `LLM 调用失败 [${status ?? 'unknown'}]: ${err.message ?? 'unknown error'} ${body}`;
      this.logger.error(msg);
      throw new BadRequestException(msg);
    }
  }

  async chatJson<T = unknown>(
    messages: ChatMessage[],
    options: ChatOptions,
  ): Promise<T> {
    const content = await this.chat(messages, {
      ...options,
      responseFormat: { type: 'json_object' },
    });
    try {
      return JSON.parse(content) as T;
    } catch {
      // 有些模型不支持 json_object 模式，尝试从代码块中提取 JSON
      const match = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const jsonStr = match ? match[1].trim() : content.trim();
      try {
        return JSON.parse(jsonStr) as T;
      } catch (parseError) {
        this.logger.error(`LLM 返回 JSON 解析失败: ${content.slice(0, 200)}`);
        throw new BadRequestException('LLM 返回内容无法解析为 JSON');
      }
    }
  }
}

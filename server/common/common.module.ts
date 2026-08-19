import { Module } from '@nestjs/common';
import { LLMService } from './services/llm.service';

@Module({
  providers: [LLMService],
  exports: [LLMService],
})
export class CommonModule {}

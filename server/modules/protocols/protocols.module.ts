import { Module } from '@nestjs/common';
import { ProtocolsController } from './protocols.controller';
import { ProtocolsService } from './protocols.service';
import { FileParseService } from './file-parse.service';
import { AiParseService } from './ai-parse.service';

@Module({
  controllers: [ProtocolsController],
  providers: [ProtocolsService, FileParseService, AiParseService],
  exports: [ProtocolsService],
})
export class ProtocolsModule {}

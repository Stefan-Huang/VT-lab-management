import { Module } from '@nestjs/common';
import { PurchaseController } from './purchase.controller';
import { PurchaseService } from './purchase.service';
import { PurchaseParserService } from './purchase-parser.service';
import { PurchaseUploadService } from './purchase-upload.service';
import { CommonModule } from '@server/common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [PurchaseController],
  providers: [
    PurchaseService,
    PurchaseParserService,
    PurchaseUploadService,
  ],
  exports: [PurchaseService],
})
export class PurchaseModule {}

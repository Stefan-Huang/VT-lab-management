import { useState, useCallback } from 'react';
import { useTranslation } from '@client/src/stores/i18nStore';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import { Button } from '@client/src/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@client/src/components/ui/collapsible';
import UploadDropzone from './UploadDropzone';
import ParseResultPanel from './ParseResultPanel';
import ManualAddForm from './ManualAddForm';
import UploadHistory from './UploadHistory';
import { purchaseApi } from '@client/src/api';
import type { ParsedPurchaseItem, UploadParseResponse } from '@shared/types';

const PurchasePage = () => {
  const { t } = useTranslation();
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseResult, setParseResult] = useState<UploadParseResponse | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const handleParse = useCallback(async (file: File) => {
    setIsParsing(true);
    setParseProgress(0);
    setParseResult(null);

    const progressTimer = setInterval(() => {
      setParseProgress((p) => {
        if (p >= 90) return p;
        return p + Math.random() * 8;
      });
    }, 300);

    try {
      const result = await purchaseApi.uploadAndParse(file);
      setParseProgress(100);
      setParseResult(result);
      toast.success(t('purchase.parseSuccess'));
      setHistoryRefreshKey((k) => k + 1);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || t('purchase.parseFailed'));
    } finally {
      clearInterval(progressTimer);
      setIsParsing(false);
    }
  }, [t]);

  const handleConfirm = useCallback(async () => {
    if (!parseResult) return;
    setIsConfirming(true);
    try {
      const items: ParsedPurchaseItem[] = parseResult.parsedItems.filter(
        (item) => item.confidence >= 0.6,
      );
      await purchaseApi.confirmUpload(parseResult.uploadId, items);
       toast.success(t('purchase.confirmSuccessCount', { count: items.length }));
      setHistoryRefreshKey((k) => k + 1);
      setParseResult(null);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setIsConfirming(false);
    }
  }, [parseResult, t]);

  const handleManualSuccess = useCallback(() => {
    setHistoryRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{t('purchase.title')}</h1>
      </div>

      {/* 1. 上传解析区 */}
      <Card>
        <CardHeader className="pb-3">
           <CardTitle className="text-base">{t('purchase.aiBatchParse')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <UploadDropzone
            onParse={handleParse}
            isParsing={isParsing}
            parseProgress={Math.floor(parseProgress)}
          />

          {parseResult && (
            <div className="pt-2 border-t border-border">
              <ParseResultPanel
                items={parseResult.parsedItems}
                avgConfidence={parseResult.avgConfidence}
                successCount={parseResult.successCount}
                onConfirm={handleConfirm}
                isConfirming={isConfirming}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. 手动添加（展开式，默认折叠） */}
      <Card>
        <Collapsible open={manualOpen} onOpenChange={setManualOpen}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t('purchase.manualAdd')}</CardTitle>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {manualOpen ? (
                    <ChevronUp className="w-4 h-4" strokeWidth={1.5} />
                  ) : (
                    <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('purchase.manualAddHint')}
            </p>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <ManualAddForm onSuccess={handleManualSuccess} />
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* 3. 上传历史列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('purchase.history')}</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadHistory key={historyRefreshKey} />
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchasePage;

import { useTranslation } from '@client/src/stores/i18nStore';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import type { ParsedPurchaseItem } from '@shared/types';

interface ParseResultPanelProps {
  items: ParsedPurchaseItem[];
  avgConfidence: number;
  successCount: number;
  onConfirm: () => void;
  isConfirming: boolean;
}

const ParseResultPanel = ({
  items,
  avgConfidence,
  successCount,
  onConfirm,
  isConfirming,
}: ParseResultPanelProps) => {
  const { t } = useTranslation();

  if (items.length === 0) return null;

  const successRate = items.length > 0 ? Math.round((successCount / items.length) * 100) : 0;
  const lowConfCount = items.filter((i) => i.confidence < 0.8).length;
  const priceUpCount = items.filter((i) => (i.priceChange ?? 0) > 0).length;

  return (
    <div className="space-y-4">
      {/* 概览面板 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border rounded-sm p-4">
          <p className="text-xs text-muted-foreground mb-1">{t('purchase.parsedCount')}</p>
          <p className="text-2xl font-mono font-bold text-foreground">{items.length}</p>
        </div>
        <div className="border rounded-sm p-4">
          <p className="text-xs text-muted-foreground mb-1">{t('purchase.avgConfidence')}</p>
          <p
            className={`text-2xl font-mono font-bold ${avgConfidence < 0.8 ? 'text-warning' : 'text-success'}`}
          >
            {(avgConfidence * 100).toFixed(1)}%
          </p>
        </div>
        <div className="border rounded-sm p-4">
          <p className="text-xs text-muted-foreground mb-1">{t('purchase.successRate')}</p>
          <p className="text-2xl font-mono font-bold text-primary">{successRate}%</p>
        </div>
      </div>

      {/* 标记说明 */}
      <div className="flex flex-wrap gap-3 items-center">
        {lowConfCount > 0 && (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
            <span className="w-1.5 h-1.5 rounded-full bg-warning mr-1.5" />
            {t('purchase.lowConfidence')} · {lowConfCount}
          </Badge>
        )}
        {priceUpCount > 0 && (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive mr-1.5" />
            {t('purchase.priceUp')} · {priceUpCount}
          </Badge>
        )}
        <div className="ml-auto">
          <Button onClick={onConfirm} disabled={isConfirming}>
            {isConfirming ? '...' : t('purchase.confirmAll')}
          </Button>
        </div>
      </div>

      {/* 结果表格 */}
      <div className="border rounded-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-accent/30">
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>{t('materials.name')}</TableHead>
              <TableHead>{t('materials.catalogNo')}</TableHead>
              <TableHead>{t('materials.category')}</TableHead>
              <TableHead>{t('materials.specification')}</TableHead>
              <TableHead>{t('materials.supplier')}</TableHead>
              <TableHead className="text-right font-mono">{t('materials.unitPrice')}</TableHead>
              <TableHead className="text-right font-mono">{t('materials.stock')}</TableHead>
              <TableHead className="text-center font-mono">{t('purchase.confidence')}</TableHead>
              <TableHead className="text-right font-mono">涨跌幅</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => {
              const isLowConf = item.confidence < 0.8;
              const isPriceUp = (item.priceChange ?? 0) > 0;
              const isPriceDown = (item.priceChange ?? 0) < 0;
              return (
                <TableRow
                  key={idx}
                  className={`
                    ${isLowConf ? 'bg-warning/5' : ''}
                    odd:bg-accent/30
                  `}
                >
                  <TableCell className="text-center text-muted-foreground font-mono text-xs">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="font-mono text-xs">{item.catalogNo}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t(`category.${item.category}`)}
                  </TableCell>
                  <TableCell className="text-xs">{item.specification || '-'}</TableCell>
                  <TableCell className="text-xs">{item.supplier || '-'}</TableCell>
                  <TableCell className="text-right font-mono">
                    {item.unitPrice.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono">{item.stock}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`font-mono text-xs ${isLowConf ? 'text-warning font-semibold' : 'text-success'}`}
                    >
                      {(item.confidence * 100).toFixed(0)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.priceChange === null ? (
                      <span className="text-xs text-muted-foreground font-mono">—</span>
                    ) : (
                      <span
                        className={`font-mono text-xs font-semibold ${isPriceUp ? 'text-destructive' : isPriceDown ? 'text-success' : 'text-muted-foreground'}`}
                      >
                        {item.priceChange > 0 ? '+' : ''}
                        {item.priceChange.toFixed(1)}%
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ParseResultPanel;

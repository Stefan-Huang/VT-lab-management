import { useEffect, useState } from 'react';
import { useTranslation } from '@client/src/stores/i18nStore';
import { Badge } from '@client/src/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { Button } from '@client/src/components/ui/button';
import { purchaseApi } from '@client/src/api';
import type { UploadRecord } from '@shared/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const UploadHistory = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<UploadRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async (currentPage: number) => {
    setLoading(true);
    try {
      const result = await purchaseApi.getUploadHistory(currentPage, pageSize);
      setItems(result.items);
      setTotal(result.total);
    } catch {
      // 失败静默
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  const statusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      success: 'default',
      parsing: 'secondary',
      pending: 'secondary',
      failed: 'outline',
    };
    const label = t(`purchase.status${status.charAt(0).toUpperCase() + status.slice(1)}`);
    const dotColor = {
      success: 'bg-success',
      parsing: 'bg-primary',
      pending: 'bg-muted-foreground',
      failed: 'bg-destructive',
    }[status] || 'bg-muted-foreground';

    return (
      <Badge
        variant={variants[status] ?? 'outline'}
        className={`${status === 'failed' ? 'bg-destructive/10 text-destructive border-destructive/30' : ''}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mr-1.5`} />
        {label}
      </Badge>
    );
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-3">
      <div className="border rounded-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-accent/30">
              <TableHead>{t('materials.name')}</TableHead>
              <TableHead className="w-32">上传时间</TableHead>
              <TableHead className="w-24 text-center">状态</TableHead>
              <TableHead className="w-20 text-right font-mono">解析条数</TableHead>
              <TableHead className="w-20 text-right font-mono">成功条数</TableHead>
              <TableHead className="w-20 text-right font-mono">失败条数</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  {t('common.loading')}
                </TableCell>
              </TableRow>
            )}
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  {t('common.noData')}
                </TableCell>
              </TableRow>
            )}
            {items.map((record) => (
              <TableRow key={record.id} className="odd:bg-accent/30">
                <TableCell className="font-medium font-mono text-sm">
                  {record.filename}
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {record.uploadDate
                    ? new Date(record.uploadDate).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-'}
                </TableCell>
                <TableCell className="text-center">{statusBadge(record.status)}</TableCell>
                <TableCell className="text-right font-mono">{record.parsedCount}</TableCell>
                <TableCell className="text-right font-mono text-success">
                  {record.successCount}
                </TableCell>
                <TableCell className="text-right font-mono text-destructive">
                  {record.failedCount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-mono">
            共 {total} 条
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            </Button>
            <span className="text-xs font-mono px-3">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadHistory;

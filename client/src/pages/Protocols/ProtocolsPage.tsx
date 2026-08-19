import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@client/src/stores/i18nStore';
import { protocolsApi } from '@client/src/api';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Label } from '@client/src/components/ui/label';
import type { Protocol, ExpType } from '@shared/types';
import { Search, Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { ProtocolForm } from './ProtocolForm';

const EXP_TYPES: ExpType[] = ['IHC', 'WB', 'qPCR', 'cell_culture', 'siRNA', 'flow', 'other'];

// 不同实验类型对应的标签颜色（背景色/文字色）
const typeBadgeStyles: Record<ExpType, string> = {
  WB: 'bg-[hsl(215_65%_35%)] text-white border-transparent',
  IHC: 'bg-[hsl(160_45%_30%)] text-white border-transparent',
  qPCR: 'bg-[hsl(187_60%_45%)] text-white border-transparent',
  cell_culture: 'bg-[hsl(210_55%_50%)] text-white border-transparent',
  siRNA: 'bg-[hsl(270_40%_50%)] text-white border-transparent',
  flow: 'bg-[hsl(25_85%_50%)] text-white border-transparent',
  other: 'bg-[hsl(210_10%_50%)] text-white border-transparent',
};

const ProtocolsPage = () => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();

  const [expType, setExpType] = useState<string>('all');
  const [keyword, setKeyword] = useState<string>('');
  const [items, setItems] = useState<Protocol[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const pageSize = 12;

  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await protocolsApi.getProtocols({
        expType: expType === 'all' ? undefined : expType,
        keyword: keyword || undefined,
        page,
        pageSize,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [expType, keyword, page, t]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleCreate = async (data: {
    name: string;
    nameEn: string;
    type: ExpType;
    description: string;
    descriptionEn: string;
    content: string;
    contentEn: string;
    sourceLang: 'zh' | 'en';
  }) => {
    setSubmitting(true);
    try {
      const res = await protocolsApi.createProtocol({
        name: data.name.trim(),
        nameEn: data.nameEn.trim(),
        type: data.type,
        description: data.description.trim(),
        descriptionEn: data.descriptionEn.trim(),
        content: data.content,
        contentEn: data.contentEn,
        sourceLang: data.sourceLang,
        attachments: [],
      });
      if (res.success) {
        toast.success(t('common.success'));
        setDialogOpen(false);
        setPage(1);
        fetchList();
      }
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* 顶部标题 + 操作栏 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {t('protocols.title')}
          </h1>
           <p className="text-sm text-muted-foreground">
             {t('protocols.totalCount', { count: total })}
           </p>
        </div>
        <Button
          variant="default"
          onClick={() => setDialogOpen(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('protocols.new')}
        </Button>
      </div>

      {/* 筛选栏 */}
      <div className="bg-card border border-border rounded-sm p-4 mb-6 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">
            {t('protocols.type')}
          </Label>
          <Select value={expType} onValueChange={(v: string) => { setExpType(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
               <SelectItem value="all">{t('common.all')}</SelectItem>
              {EXP_TYPES.map((type: ExpType) => (
                <SelectItem key={type} value={type}>
                  {t(`expType.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[240px] max-w-[400px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={`${t('common.search')}...`}
            value={keyword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
      </div>

      {/* 卡片网格 */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">{t('common.loading')}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 border border-border rounded-sm bg-card">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">{t('common.noData')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item: Protocol) => (
              <div
                key={item.id}
                onClick={() => navigate(`/protocols/${item.id}`)}
                className="bg-card border border-border rounded-sm p-4 cursor-pointer transition-colors hover:border-primary/40 hover:bg-accent/20 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground text-base leading-snug line-clamp-2 flex-1">
                    {lang === 'en' && item.nameEn ? item.nameEn : item.name}
                  </h3>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${typeBadgeStyles[item.type]}`}
                  >
                    {t(`expType.${item.type}`)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-1">
                   {(lang === 'en' && item.descriptionEn ? item.descriptionEn : item.description) || t('protocols.noSummary')}
                 </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                  <span className="font-mono">
                    {item.createdAt ? item.createdAt.slice(0, 10) : ''}
                  </span>
                  {item.attachments && item.attachments.length > 0 && (
                    <span>{t('protocols.attachmentsCount', { count: item.attachments.length })}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p: number) => p - 1)}
              >
                 {t('common.prevPage')}
               </Button>
              <span className="text-sm text-muted-foreground px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p: number) => p + 1)}
              >
                 {t('common.nextPage')}
               </Button>
            </div>
          )}
        </>
      )}

      {/* 新建弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t('protocols.new')}</DialogTitle>
          </DialogHeader>
          <ProtocolForm
            mode="create"
            submitting={submitting}
            onSubmit={handleCreate}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProtocolsPage;

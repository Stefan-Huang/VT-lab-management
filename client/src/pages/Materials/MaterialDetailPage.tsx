import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@client/src/components/ui/card';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@client/src/components/ui/alert-dialog';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Calendar,
  Building2,
  Info,
} from 'lucide-react';
import { useTranslation } from '@client/src/stores/i18nStore';
import {
  getMaterialById,
  getPriceHistory,
  deleteMaterial,
} from '@client/src/api/materials';
import type { Material, PriceHistoryItem } from '@shared/types';

const MaterialDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: material, isLoading: materialLoading } = useQuery({
    queryKey: ['materials', 'detail', id],
    queryFn: () => id ? getMaterialById(id) : null,
    enabled: !!id,
  });

  const { data: priceHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['materials', 'price-history', id],
    queryFn: () => id ? getPriceHistory(id) : null,
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => id ? deleteMaterial(id) : null,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      navigate('/materials', { replace: true });
    },
  });

  const formatPrice = (price: string | number) => {
    return `¥${Number(price).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const categoryLabel = (cat: string) => {
    return t(`category.${cat}` as any) || cat;
  };

  const getChangeColor = (change: number | null | undefined) => {
    if (change === null || change === undefined) return 'text-muted-foreground';
    if (change > 0) return 'text-destructive';
    if (change < 0) return 'text-success';
    return 'text-muted-foreground';
  };

  const getChangeIcon = (change: number | null | undefined) => {
    if (change === null || change === undefined) return <Minus className="size-3" />;
    if (change > 0) return <TrendingUp className="size-3" />;
    if (change < 0) return <TrendingDown className="size-3" />;
    return <Minus className="size-3" />;
  };

  if (materialLoading) {
    return (
      <div className="flex h-full items-center justify-center py-20 text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  if (!material) {
    return (
      <div className="flex h-full items-center justify-center py-20 text-muted-foreground">
         {t('material.notFound')}
      </div>
    );
  }

  const m = material as Material;

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/materials')}
            className="gap-1"
          >
            <ArrowLeft className="size-4" />
             {t('common.backToList')}
           </Button>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-xl font-bold text-foreground">{m.name}</h1>
          <Badge variant="outline">{categoryLabel(m.category)}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Edit3 className="mr-1 size-4" />
            {t('common.edit')}
          </Button>
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-1 size-4" />
                {t('common.delete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                 <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
                 <AlertDialogDescription>
                   {t('material.deleteConfirm', { name: m.name })}
                 </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={() => deleteMutation.mutate()}
                >
                  {t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
             <CardTitle className="text-base">{t('material.basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">{t('materials.catalogNo')}</p>
                <p className="mt-1 font-mono font-medium">{m.catalogNo}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('materials.specification')}</p>
                <p className="mt-1 font-medium">{m.specification || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('materials.supplier')}</p>
                <p className="mt-1 flex items-center gap-1">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  {m.supplier || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('materials.unitPrice')}</p>
                <p className="mt-1 font-mono font-bold text-primary">
                  {formatPrice(m.unitPrice)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('materials.stock')}</p>
                <p className={`mt-1 font-mono font-bold ${m.stock <= 5 ? 'text-destructive' : ''}`}>
                  {m.stock}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('materials.purchaseDate')}</p>
                <p className="mt-1 flex items-center gap-1 font-mono">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  {m.purchaseDate || '-'}
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">{t('materials.remark')}</p>
               <p className="mt-1 text-sm text-foreground">{m.remark || t('common.none')}</p>
            </div>
          </CardContent>
        </Card>

        {/* 价格统计摘要 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-primary" />
               {t('material.priceSummary')}
             </CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="py-8 text-center text-muted-foreground">{t('common.loading')}</div>
            ) : (
              <div className="space-y-4">
                {priceHistory?.latestChangePercent !== null &&
                  priceHistory?.latestChangePercent !== undefined && (
                    <div
                      className={`rounded-sm border p-4 ${
                        priceHistory.latestChangePercent > 0
                          ? 'border-destructive/30 bg-destructive/5'
                          : priceHistory.latestChangePercent < 0
                          ? 'border-success/30 bg-success/5'
                          : 'border-border bg-accent/50'
                      }`}
                    >
                       <p className="text-xs text-muted-foreground">{t('material.latestChange')}</p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span
                          className={`text-3xl font-bold font-mono ${getChangeColor(
                            priceHistory.latestChangePercent,
                          )}`}
                        >
                          {priceHistory.latestChangePercent > 0 ? '+' : ''}
                          {priceHistory.latestChangePercent.toFixed(2)}%
                        </span>
                        <span className={getChangeColor(priceHistory.latestChangePercent)}>
                          {getChangeIcon(priceHistory.latestChangePercent)}
                        </span>
                      </div>
                       <p className="mt-1 text-xs text-muted-foreground">
                         {t('material.vsLastPurchase')}
                       </p>
                    </div>
                  )}

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-sm border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground">{t('material.avgPrice')}</p>
                    <p className="mt-1 font-mono font-bold text-foreground">
                      {formatPrice(priceHistory?.avgPrice || 0)}
                    </p>
                  </div>
                  <div className="rounded-sm border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground">{t('material.maxPrice')}</p>
                    <p className="mt-1 font-mono font-bold text-destructive">
                      {formatPrice(priceHistory?.maxPrice || 0)}
                    </p>
                  </div>
                  <div className="rounded-sm border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground">{t('material.minPrice')}</p>
                    <p className="mt-1 font-mono font-bold text-success">
                      {formatPrice(priceHistory?.minPrice || 0)}
                    </p>
                  </div>
                </div>

                <div className="rounded-sm border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {t('material.fluctuation')}
                    </span>
                    <span className="font-mono font-medium">
                      {priceHistory?.fluctuation?.toFixed(2) || 0}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-accent">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(100, priceHistory?.fluctuation || 0)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 价格历史时间线 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4 text-primary" />
            {t('material.priceHistory')}
            <Badge variant="outline" className="ml-1">
               {t('common.totalRecords', { count: priceHistory?.history?.length || 0 })}
             </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="py-8 text-center text-muted-foreground">{t('common.loading')}</div>
          ) : priceHistory?.history?.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">{t('common.noData')}</div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-4">
                {[...(priceHistory?.history || [])]
                  .reverse()
                  .map((item: PriceHistoryItem, index: number) => (
                    <div key={item.id} className="relative flex items-start gap-4 pl-10">
                      <div
                        className={`absolute left-2 top-1.5 size-4 rounded-full border-2 ${
                          index === 0
                            ? 'border-primary bg-primary'
                            : 'border-border bg-background'
                        }`}
                      />
                      <div className="flex flex-1 items-start justify-between rounded-sm border border-border bg-card p-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-muted-foreground">
                              {item.date}
                            </span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">
                              {item.supplier}
                            </span>
                          </div>
                          <div className="mt-1 flex items-baseline gap-3">
                            <span className="font-mono font-bold text-foreground">
                              {formatPrice(item.price)}
                            </span>
                             <span className="text-xs text-muted-foreground">
                               {t('material.stockAdded', { count: item.stockAdded })}
                             </span>
                          </div>
                        </div>
                        <div
                          className={`flex items-center gap-1 ${getChangeColor(
                            item.changePercent,
                          )}`}
                        >
                          {getChangeIcon(item.changePercent)}
                          <span className="font-mono text-sm font-medium">
                            {item.changePercent === null
                              ? '—'
                              : `${item.changePercent > 0 ? '+' : ''}${item.changePercent.toFixed(2)}%`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MaterialDetailPage;

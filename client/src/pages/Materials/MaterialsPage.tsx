import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import CountUp from 'react-countup';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Input } from '@client/src/components/ui/input';
import { Button } from '@client/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { Badge } from '@client/src/components/ui/badge';
import {
  Search,
  Plus,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  DollarSign,
  Layers,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useTranslation } from '@client/src/stores/i18nStore';
import {
  getMaterials,
  getMaterialStatistics,
} from '@client/src/api/materials';
import type { Material, MaterialCategory } from '@shared/types';

const CATEGORIES: MaterialCategory[] = [
  'antibody',
  'plasmid',
  'serum',
  'antibiotic',
  'primer',
  'other',
];

const LOW_STOCK_THRESHOLD = 5;

const MaterialsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState('purchaseDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['materials', 'statistics'],
    queryFn: getMaterialStatistics,
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['materials', 'list', page, pageSize, category, keyword, sortBy, sortOrder],
    queryFn: () =>
      getMaterials({
        page,
        pageSize,
        category: category === 'all' ? undefined : category,
        keyword: keyword || undefined,
        sortBy,
        sortOrder,
      }),
  });

  const totalPages = useMemo(() => {
    if (!listData) return 0;
    return Math.ceil(listData.total / pageSize);
  }, [listData]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <ChevronDown className="size-3 opacity-30" />;
    return sortOrder === 'asc' ? (
      <ChevronUp className="size-3 text-primary" />
    ) : (
      <ChevronDown className="size-3 text-primary" />
    );
  };

  const categoryLabel = (cat: MaterialCategory) => {
    return t(`category.${cat}` as any) || cat;
  };

  const formatPrice = (price: string) => {
    return `¥${Number(price).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('materials.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('materials.subtitle')}
          </p>
        </div>
        <Button onClick={() => navigate('/purchase')}>
          <Plus className="mr-2 size-4" />
          {t('purchase.manualAdd')}
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-sm bg-primary/10">
                <Package className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('materials.total')}</p>
                <p className="text-2xl font-bold font-mono text-foreground count-up-number">
                  {statsLoading ? '-' : (
                    <CountUp end={stats?.totalCount || 0} duration={1.2} separator="," />
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-sm bg-accent">
                <Layers className="size-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('materials.categoryDist')}</p>
                <p className="text-2xl font-bold font-mono text-foreground count-up-number">
                  {statsLoading ? '-' : (
                    <CountUp end={stats?.categoryDistribution?.length || 0} duration={1.2} />
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-sm bg-destructive/10">
                <AlertTriangle className="size-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('materials.lowStock')}</p>
                <p className="text-2xl font-bold font-mono text-destructive count-up-number">
                  {statsLoading ? '-' : (
                    <CountUp end={stats?.lowStockCount || 0} duration={1.2} />
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-sm bg-success/10">
                <DollarSign className="size-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('materials.monthlyAmount')}</p>
                <p className="text-2xl font-bold font-mono text-foreground count-up-number">
                  {statsLoading ? '-' : (
                    <span>
                      ¥<CountUp
                        end={Number(stats?.monthlyPurchaseAmount || 0)}
                        duration={1.2}
                        separator=","
                        decimals={0}
                      />
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选栏 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('materials.category')}:</span>
              <Select value={category} onValueChange={(val) => { setCategory(val); setPage(1); }}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.allCategories')}</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {categoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('materials.unitPrice')}:</span>
              <Select value={sortBy === 'price' ? sortOrder : 'none'} onValueChange={(val) => {
                if (val === 'none') { setSortBy('purchaseDate'); setSortOrder('desc'); }
                else { setSortBy('price'); setSortOrder(val as 'asc' | 'desc'); }
              }}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={t('common.defaultSort')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('common.defaultSort')}</SelectItem>
                  <SelectItem value="asc">{t('common.priceAsc')}</SelectItem>
                  <SelectItem value="desc">{t('common.priceDesc')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="w-64 pl-9"
                  placeholder={t('common.search')}
                  value={keyword}
                  onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 物资表格 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                  <span className="flex items-center gap-1">
                    {t('materials.name')}
                    <SortIcon field="name" />
                  </span>
                </TableHead>
                <TableHead>{t('materials.category')}</TableHead>
                <TableHead className="font-mono">{t('materials.catalogNo')}</TableHead>
                <TableHead>{t('materials.specification')}</TableHead>
                <TableHead>{t('materials.supplier')}</TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => handleSort('price')}>
                  <span className="flex items-center justify-end gap-1">
                    {t('materials.unitPrice')}
                    <SortIcon field="price" />
                  </span>
                </TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => handleSort('stock')}>
                  <span className="flex items-center justify-end gap-1">
                    {t('materials.stock')}
                    <SortIcon field="stock" />
                  </span>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('purchaseDate')}>
                  <span className="flex items-center gap-1">
                    {t('materials.purchaseDate')}
                    <SortIcon field="purchaseDate" />
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : listData?.items?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                listData?.items?.map((item: Material) => {
                  const isLowStock = item.stock <= LOW_STOCK_THRESHOLD;
                  return (
                    <TableRow
                      key={item.id}
                      className={`cursor-pointer transition-colors ${
                        isLowStock ? 'bg-destructive/5 hover:bg-destructive/10' : 'hover:bg-accent/50'
                      }`}
                      onClick={() => navigate(`/materials/${item.id}`)}
                    >
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {isLowStock && (
                            <span className="size-2 rounded-full bg-destructive animate-pulse" />
                          )}
                          {item.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {categoryLabel(item.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.catalogNo}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.specification}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.supplier}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatPrice(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={isLowStock ? 'font-bold text-destructive' : ''}>
                          {item.stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {item.purchaseDate}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {t('common.totalRecords', { count: listData?.total || 0 })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t('common.prevPage')}
            </Button>
            <span className="px-2 text-sm font-mono text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t('common.nextPage')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsPage;

import { useState } from 'react';
import { useTranslation } from '@client/src/stores/i18nStore';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Textarea } from '@client/src/components/ui/textarea';
import { Badge } from '@client/src/components/ui/badge';
import { purchaseApi } from '@client/src/api';
import type { MaterialCategory, PriceHistoryByCatalogResponse } from '@shared/types';

const CATEGORIES: MaterialCategory[] = [
  'antibody',
  'plasmid',
  'serum',
  'antibiotic',
  'primer',
  'other',
];

interface ManualAddFormProps {
  onSuccess: () => void;
}

const ManualAddForm = ({ onSuccess }: ManualAddFormProps) => {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<MaterialCategory>('other');
  const [catalogNo, setCatalogNo] = useState('');
  const [specification, setSpecification] = useState('');
  const [supplier, setSupplier] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [stock, setStock] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [remark, setRemark] = useState('');

  const [priceHistory, setPriceHistory] = useState<PriceHistoryByCatalogResponse | null>(null);
  const [isCheckingPrice, setIsCheckingPrice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCatalogBlur = async () => {
    if (!catalogNo.trim()) {
      setPriceHistory(null);
      return;
    }
    setIsCheckingPrice(true);
    try {
      const result = await purchaseApi.getPriceHistoryByCatalog(catalogNo.trim());
      setPriceHistory(result);
    } catch {
      setPriceHistory(null);
    } finally {
      setIsCheckingPrice(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('请输入名称');
      return;
    }
    if (!catalogNo.trim()) {
      toast.error('请输入货号');
      return;
    }
    const price = Number(unitPrice);
    if (Number.isNaN(price) || price <= 0) {
      toast.error('请输入有效单价');
      return;
    }
    const qty = Number(stock);
    if (Number.isNaN(qty) || qty < 0) {
      toast.error('存量不能为负');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await purchaseApi.manualPurchase({
        name: name.trim(),
        category,
        catalogNo: catalogNo.trim(),
        specification: specification.trim(),
        supplier: supplier.trim(),
        unitPrice: price,
        stock: qty,
        purchaseDate,
        remark: remark.trim(),
      });

      if (result.isNew) {
        toast.success(t('common.success'));
      } else if (result.priceChange !== null && result.priceChange > 0) {
        toast.success(`入库成功，价格上涨 ${result.priceChange.toFixed(1)}%`);
      } else {
        toast.success(t('common.success'));
      }

      // 重置表单
      setName('');
      setCategory('other');
      setCatalogNo('');
      setSpecification('');
      setSupplier('');
      setUnitPrice('');
      setStock('');
      setRemark('');
      setPriceHistory(null);

      onSuccess();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 计算价格变化百分比
  const priceChangePercent =
    priceHistory?.exists && priceHistory.avgPrice && Number(unitPrice) > 0
      ? ((Number(unitPrice) - priceHistory.avgPrice) / priceHistory.avgPrice) * 100
      : null;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label>{t('materials.name')} *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="物资名称" />
      </div>

      <div className="space-y-1.5">
        <Label>{t('materials.category')} *</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as MaterialCategory)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {t(`category.${cat}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>{t('materials.catalogNo')} *</Label>
        <Input
          value={catalogNo}
          onChange={(e) => setCatalogNo(e.target.value)}
          onBlur={handleCatalogBlur}
          placeholder="货号"
          className="font-mono"
        />
        {isCheckingPrice && (
          <p className="text-xs text-muted-foreground font-mono">查询中...</p>
        )}
        {priceHistory?.exists && priceHistory.avgPrice !== null && !isCheckingPrice && (
          <p className="text-xs text-muted-foreground font-mono">
            {t('purchase.priceHistoryHint')}: ¥{priceHistory.avgPrice.toFixed(2)}
          </p>
        )}
        {priceHistory && !priceHistory.exists && !isCheckingPrice && (
          <p className="text-xs text-muted-foreground font-mono">新货号</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>{t('materials.specification')}</Label>
        <Input
          value={specification}
          onChange={(e) => setSpecification(e.target.value)}
          placeholder="规格"
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('materials.supplier')}</Label>
        <Input
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          placeholder="供应商"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>{t('materials.unitPrice')} *</Label>
          {priceChangePercent !== null && (
            <Badge
              variant="outline"
              className={
                priceChangePercent > 0
                  ? 'bg-destructive/10 text-destructive border-destructive/30'
                  : priceChangePercent < 0
                    ? 'bg-success/10 text-success border-success/30'
                    : ''
              }
            >
              {priceChangePercent > 0 ? '+' : ''}
              {priceChangePercent.toFixed(1)}%
            </Badge>
          )}
        </div>
        <Input
          type="number"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          placeholder="0.00"
          className="font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('materials.stock')}</Label>
        <Input
          type="number"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          placeholder="0"
          className="font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('materials.purchaseDate')} *</Label>
        <Input
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
          className="font-mono"
        />
      </div>

      <div className="space-y-1.5 col-span-2">
        <Label>{t('materials.remark')}</Label>
        <Textarea
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="备注"
          rows={2}
        />
      </div>

      <div className="col-span-2 flex justify-end pt-2">
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? '...' : t('common.confirm')}
        </Button>
      </div>
    </div>
  );
};

export default ManualAddForm;

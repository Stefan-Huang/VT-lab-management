import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@client/src/stores/i18nStore';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { Textarea } from '@client/src/components/ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '@client/src/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@client/src/components/ui/dialog';
import { researchApi } from '@client/src/api';
import type { ResearchPlanItem, ResearchPlanRecord, AvailableReagent } from '@shared/types';
import {
  Sparkles,
  Copy,
  Save,
  Trash2,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Beaker,
  Target,
  Route,
  FlaskConical,
  Lightbulb,
  ChevronRight,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';

const ResearchPage = () => {
  const { t } = useTranslation();
  const [direction, setDirection] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [plans, setPlans] = useState<ResearchPlanItem[]>([]);
  const [error, setError] = useState('');
  const [savedPlans, setSavedPlans] = useState<ResearchPlanRecord[]>([]);
  const [totalSaved, setTotalSaved] = useState(0);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [detailPlan, setDetailPlan] = useState<ResearchPlanItem | null>(null);

  const fetchSavedPlans = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const resp = await researchApi.getPlanList({ page: 1, pageSize: 20 });
      setSavedPlans(resp.items);
      setTotalSaved(resp.total);
    } catch (err) {
      logger.error('获取历史方案失败', err);
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedPlans();
  }, [fetchSavedPlans]);

  const handleGenerate = async () => {
    if (!direction.trim()) {
       setError(t('research.directionRequired'));
      return;
    }
    setError('');
    setIsGenerating(true);
    setPlans([]);
    try {
      const resp = await researchApi.generatePlans({ direction: direction.trim() });
      setPlans(resp.plans);
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'response' in err
             ? (err as { response?: { data?: { message?: string } } }).response?.data
               ?.message || t('research.generateFailed')
           : t('research.generateFailedRetry');
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePlan = async (plan: ResearchPlanItem) => {
    try {
      await researchApi.savePlan({
        title: plan.title,
        direction,
        content: plan,
        reagentsUsed: plan.availableReagents as unknown as Array<Record<string, unknown>>,
        estimatedSavings: plan.estimatedSavings,
      });
      setSavedIds((prev) => new Set(prev).add(plan.id));
      await fetchSavedPlans();
    } catch (err) {
      logger.error('保存方案失败', err);
       setError(t('research.saveFailed'));
    }
  };

  const handleCopyPlan = (plan: ResearchPlanItem) => {
     const text = `【${plan.title}】\n${t('research.copyAngle')}${plan.angle}\n${t('research.copyTargets')}${plan.targets.join(t('research.copySeparator'))}\n${t('research.copyPathways')}${plan.pathways.join(t('research.copySeparator'))}\n${t('research.copyReasoning')}${plan.reasoning}\n${t('research.copySavings')}¥${plan.estimatedSavings.toLocaleString()}`;
    navigator.clipboard.writeText(text).catch(() => {
      logger.error('复制失败');
    });
  };

  const handleDeletePlan = async (id: string) => {
    try {
      await researchApi.deletePlan(id);
      setSavedPlans((prev) => prev.filter((p) => p.id !== id));
      setTotalSaved((prev) => Math.max(0, prev - 1));
    } catch (err) {
      logger.error('删除方案失败', err);
    }
  };

  const getAvailabilityBadge = (availability: AvailableReagent['availability']) => {
    switch (availability) {
      case 'sufficient':
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-success/10 text-success border-success/30"
          >
             {t('research.sufficient')}
           </Badge>
        );
      case 'partial':
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-warning/10 text-warning border-warning/30"
          >
             {t('research.partial')}
           </Badge>
        );
      case 'none':
      default:
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-muted text-muted-foreground border-border"
          >
             {t('research.none')}
           </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 输入区 */}
      <Card className="rounded-sm border border-border shadow-none" data-ai-section-type="card-stat">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Beaker className="size-5 text-primary" />
            {t('research.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
           <p className="text-sm text-muted-foreground">
             {t('research.intro')}
           </p>
          <Textarea
            placeholder={t('research.placeholder')}
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            className="min-h-[120px] font-mono text-sm"
          />
          <div className="flex items-center justify-between">
             <span className="text-xs text-muted-foreground">
               {t('research.example')}
             </span>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !direction.trim()}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {isGenerating ? t('research.generating') : t('research.submit')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive" className="rounded-sm">
          <XCircle className="size-4" />
          <AlertTitle>{t('common.error')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 加载状态 */}
      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="size-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">{t('research.generating')}</p>
        </div>
      )}

      {/* 推荐结果 */}
      {!isGenerating && plans.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
             {t('research.planCount')} <span className="text-sm font-normal text-muted-foreground">{t('research.planCountSuffix', { count: plans.length })}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                onClick={() => setDetailPlan(plan)}
                className="rounded-sm border border-border shadow-none flex flex-col cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                data-ai-section-type="card-list"
              >
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="text-base font-semibold leading-snug">
                    {plan.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{plan.angle}</p>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3 flex-1">
                  {/* 靶点 */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                      {t('research.targets')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {plan.targets.map((target) => (
                        <Badge
                          key={target}
                          variant="secondary"
                          className="text-[11px] font-mono"
                        >
                          {target}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {/* 通路 */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                      {t('research.pathways')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {plan.pathways.map((pathway) => (
                        <Badge
                          key={pathway}
                          variant="outline"
                          className="text-[11px]"
                        >
                          {pathway}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {/* 试剂 */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                      {t('research.reagents')}
                    </p>
                    {plan.availableReagents.length === 0 ? (
                       <p className="text-xs text-muted-foreground italic">{t('research.noReagent')}</p>
                    ) : (
                      <div className="space-y-1.5 max-h-[120px] overflow-auto">
                        {plan.availableReagents.map((reagent) => (
                          <div
                            key={reagent.id}
                            className="flex items-center justify-between text-xs py-0.5"
                          >
                            <span className="truncate mr-2 font-mono">{reagent.name}</span>
                            {getAvailabilityBadge(reagent.availability)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* 节省经费 */}
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t('research.savings')}
                    </p>
                    <p className="text-2xl font-bold text-success font-mono">
                      ¥{plan.estimatedSavings.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
                <div className="p-4 pt-0 flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSavePlan(plan);
                    }}
                    disabled={savedIds.has(plan.id)}
                  >
                    {savedIds.has(plan.id) ? (
                      <CheckCircle className="size-3.5" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                     {savedIds.has(plan.id) ? t('research.saved') : t('research.savePlan')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyPlan(plan);
                    }}
                  >
                    <Copy className="size-3.5" />
                     {t('research.copy')}
                   </Button>
                </div>
                <div className="px-4 pb-3 pt-0 flex items-center justify-end text-xs text-primary font-medium">
                  {t('research.viewDetail')}
                  <ChevronRight className="size-3.5" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 历史记录 */}
      <div className="space-y-3 pt-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="size-4 text-primary" />
          {t('research.history')}{' '}
          <span className="text-sm font-normal text-muted-foreground">
           {t('research.planCountSuffix', { count: totalSaved })}
         </span>
        </h2>
        {loadingSaved ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 text-primary animate-spin" />
          </div>
        ) : savedPlans.length === 0 ? (
          <Card className="rounded-sm border border-border shadow-none">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {t('common.noData')}
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-sm border border-border shadow-none overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  <th className="text-left font-medium p-3 text-xs text-muted-foreground">
                    {t('materials.name')}
                  </th>
                  <th className="text-left font-medium p-3 text-xs text-muted-foreground">
                     {t('research.direction')}
                   </th>
                  <th className="text-right font-medium p-3 text-xs text-muted-foreground">
                    {t('research.savings')}
                  </th>
                  <th className="text-left font-medium p-3 text-xs text-muted-foreground">
                     {t('research.createdAt')}
                   </th>
                  <th className="text-right font-medium p-3 text-xs text-muted-foreground w-20">
                     {t('research.operation')}
                   </th>
                </tr>
              </thead>
              <tbody>
                {savedPlans.map((plan, idx) => (
                  <tr
                    key={plan.id}
                    className={`border-b border-border last:border-b-0 ${
                      idx % 2 === 0 ? '' : 'bg-accent/20'
                    }`}
                  >
                    <td className="p-3 font-medium">{plan.title}</td>
                    <td className="p-3 text-muted-foreground truncate max-w-[240px]">
                      {plan.researchDirection || '-'}
                    </td>
                    <td className="p-3 text-right font-mono text-success font-semibold">
                      ¥{Number(plan.estimatedSavings).toLocaleString()}
                    </td>
                    <td className="p-3 text-muted-foreground font-mono text-xs">
                      {plan.createdAt
                        ? new Date(plan.createdAt).toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeletePlan(plan.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
      {/* 方案详情弹窗 */}
      <Dialog open={detailPlan !== null} onOpenChange={(open) => !open && setDetailPlan(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailPlan && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">{detailPlan.title}</DialogTitle>
                <DialogDescription className="text-sm">
                  {detailPlan.angle}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                <div className="grid grid-cols-2 gap-4 rounded-sm bg-accent/40 p-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('research.savings')}</p>
                    <p className="text-2xl font-bold text-success">
                      ¥{detailPlan.estimatedSavings.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('research.reagents')}</p>
                    <p className="text-2xl font-bold text-primary">
                      {detailPlan.availableReagents.length}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="size-4 text-primary" />
                    <p className="text-sm font-semibold">{t('research.targets')}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detailPlan.targets.map((target) => (
                      <Badge key={target} variant="secondary" className="text-xs font-mono">
                        {target}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Route className="size-4 text-primary" />
                    <p className="text-sm font-semibold">{t('research.pathways')}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detailPlan.pathways.map((pathway) => (
                      <Badge key={pathway} variant="outline" className="text-xs">
                        {pathway}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FlaskConical className="size-4 text-primary" />
                    <p className="text-sm font-semibold">{t('research.availableReagentList')}</p>
                  </div>
                  {detailPlan.availableReagents.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">{t('research.noReagent')}</p>
                  ) : (
                    <div className="rounded-sm border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-accent/40">
                            <th className="text-left text-xs font-medium text-muted-foreground p-2.5">
                              {t('materials.name')}
                            </th>
                            <th className="text-left text-xs font-medium text-muted-foreground p-2.5">
                              {t('materials.category')}
                            </th>
                            <th className="text-right text-xs font-medium text-muted-foreground p-2.5">
                              {t('materials.stock')}
                            </th>
                            <th className="text-right text-xs font-medium text-muted-foreground p-2.5">
                              {t('research.availability')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailPlan.availableReagents.map((reagent) => (
                            <tr key={reagent.id} className="border-t border-border">
                              <td className="p-2.5 font-mono text-xs">{reagent.name}</td>
                              <td className="p-2.5 text-xs text-muted-foreground">
                                {t(`category.${reagent.category}`) || reagent.category}
                              </td>
                              <td className="p-2.5 text-right font-mono text-xs">{reagent.stock}</td>
                              <td className="p-2.5 text-right">
                                {getAvailabilityBadge(reagent.availability)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="size-4 text-primary" />
                    <p className="text-sm font-semibold">{t('research.reasoning')}</p>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {detailPlan.reasoning}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <Button
                  className="flex-1 gap-2"
                  onClick={() => handleSavePlan(detailPlan)}
                  disabled={savedIds.has(detailPlan.id)}
                >
                  {savedIds.has(detailPlan.id) ? (
                    <CheckCircle className="size-4" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {savedIds.has(detailPlan.id) ? t('research.saved') : t('research.savePlan')}
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => handleCopyPlan(detailPlan)}>
                  <Copy className="size-4" />
                  {t('research.copy')}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResearchPage;

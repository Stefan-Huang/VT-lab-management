import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '@client/src/stores/i18nStore';
import { useApiConfigStore } from '@client/src/stores/apiConfigStore';
import { protocolsApi } from '@client/src/api';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@client/src/components/ui/tabs';
import type { Protocol, ExpType } from '@shared/types';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Paperclip,
  Languages,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { ProtocolForm } from './ProtocolForm';

const EXP_TYPES: ExpType[] = [
  'IHC',
  'WB',
  'qPCR',
  'cell_culture',
  'siRNA',
  'flow',
  'other',
];

const typeBadgeStyles: Record<ExpType, string> = {
  WB: 'bg-[hsl(215_65%_35%)] text-white border-transparent',
  IHC: 'bg-[hsl(160_45%_30%)] text-white border-transparent',
  qPCR: 'bg-[hsl(187_60%_45%)] text-white border-transparent',
  cell_culture: 'bg-[hsl(210_55%_50%)] text-white border-transparent',
  siRNA: 'bg-[hsl(270_40%_50%)] text-white border-transparent',
  flow: 'bg-[hsl(25_85%_50%)] text-white border-transparent',
  other: 'bg-[hsl(210_10%_50%)] text-white border-transparent',
};

const ProtocolDetailPage = () => {
  const { t, lang, setLanguage } = useTranslation();
  const { apiBaseUrl, apiKey, modelName } = useApiConfigStore();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [translating, setTranslating] = useState<'zh' | 'en' | null>(null);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await protocolsApi.getProtocolById(id);
      setProtocol(data);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleEdit = async (data: {
    name: string;
    nameEn: string;
    type: ExpType;
    description: string;
    descriptionEn: string;
    content: string;
    contentEn: string;
    sourceLang: 'zh' | 'en';
  }) => {
    if (!id) return;
    setSubmitting(true);
    try {
      const res = await protocolsApi.updateProtocol(id, {
        name: data.name.trim(),
        nameEn: data.nameEn.trim(),
        type: data.type,
        description: data.description.trim(),
        descriptionEn: data.descriptionEn.trim(),
        content: data.content,
        contentEn: data.contentEn,
        sourceLang: data.sourceLang,
      });
      if (res.success) {
        toast.success(t('common.success'));
        setEditOpen(false);
        fetchDetail();
      }
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      const res = await protocolsApi.deleteProtocol(id);
      if (res.success) {
        toast.success(t('common.success'));
        navigate('/protocols');
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleGenerateTranslation = async (target: 'zh' | 'en') => {
    if (!protocol || !apiKey) {
      toast.error(t('protocols.apiKeyMissing'));
      return;
    }
    setTranslating(target);
    try {
      const sourceText = target === 'zh' ? protocol.contentEn : protocol.content;
      const sourceTitle = target === 'zh' ? protocol.nameEn : protocol.name;
      const sourceSummary = target === 'zh' ? protocol.descriptionEn : protocol.description;

      const [translatedContent, translatedTitle, translatedSummary] = await Promise.all([
        protocolsApi.translateProtocol({
          text: sourceText,
          apiBaseUrl,
          apiKey,
          modelName,
          targetLang: target,
        }),
        sourceTitle
          ? protocolsApi.translateProtocol({
              text: sourceTitle,
              apiBaseUrl,
              apiKey,
              modelName,
              targetLang: target,
            })
          : Promise.resolve({ translated: '' }),
        sourceSummary
          ? protocolsApi.translateProtocol({
              text: sourceSummary,
              apiBaseUrl,
              apiKey,
              modelName,
              targetLang: target,
            })
          : Promise.resolve({ translated: '' }),
      ]);

      const updateData = target === 'zh'
        ? {
            name: translatedTitle.translated,
            description: translatedSummary.translated,
            content: translatedContent.translated,
          }
        : {
            nameEn: translatedTitle.translated,
            descriptionEn: translatedSummary.translated,
            contentEn: translatedContent.translated,
          };

      const res = await protocolsApi.updateProtocol(id!, updateData);
      if (res.success) {
        toast.success(t('protocols.translateSuccess'));
        fetchDetail();
      }
    } catch (error) {
      const msg =
        (error as { response?: { data?: { message?: string } } }).response
          ?.data?.message || t('protocols.translateFailed');
      toast.error(msg);
    } finally {
      setTranslating(null);
    }
  };

  const getName = () =>
    lang === 'en' && protocol?.nameEn ? protocol.nameEn : protocol?.name || '';
  const getDescription = () =>
    lang === 'en' && protocol?.descriptionEn
      ? protocol.descriptionEn
      : protocol?.description || '';
  const getContent = () =>
    lang === 'en' && protocol?.contentEn ? protocol.contentEn : protocol?.content || '';

  const hasZh = !!(protocol?.name || protocol?.content);
  const hasEn = !!(protocol?.nameEn || protocol?.contentEn);

  if (loading) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="text-center py-16 text-muted-foreground">
          {t('common.loading')}
        </div>
      </div>
    );
  }

  if (!protocol) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="text-center py-16 border border-border rounded-sm bg-card">
          <p className="text-muted-foreground">{t('common.noData')}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/protocols')}
          >
            {t('common.backToList')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate('/protocols')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {getName()}
            </h1>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${typeBadgeStyles[protocol.type]}`}
              >
                {t(`expType.${protocol.type}`)}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {t('protocols.createdOn', {
                  date: protocol.createdAt?.slice(0, 10) || '',
                })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-border rounded-sm p-0.5">
            <Button
              variant={lang === 'zh' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setLanguage('zh')}
            >
              中文
            </Button>
            <Button
              variant={lang === 'en' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setLanguage('en')}
            >
              EN
            </Button>
          </div>
          <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
            <Edit2 className="w-4 h-4" />
            {t('common.edit')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {t('common.delete')}
          </Button>
        </div>
      </div>

      {getDescription() && (
        <div className="bg-card border border-border rounded-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-2">
            {t('protocols.summary')}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {getDescription()}
          </p>
        </div>
      )}

      <div className="bg-card border border-border rounded-sm p-8 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Languages className="w-4 h-4" />
            {t('protocols.content')}
            <span className="text-xs font-normal text-muted-foreground ml-2">
              ({lang === 'zh' ? t('protocols.viewingZh') : t('protocols.viewingEn')})
            </span>
          </h2>
        </div>

        {getContent() ? (
          <div className="whitespace-pre-wrap leading-7 text-foreground text-[15px] max-w-[900px]">
            {getContent()}
          </div>
        ) : (
          <div className="py-12 text-center border border-dashed border-border rounded-sm">
            <AlertCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              {lang === 'zh' ? t('protocols.noZhVersion') : t('protocols.noEnVersion')}
            </p>
            <Button
              size="sm"
              onClick={() => handleGenerateTranslation(lang as 'zh' | 'en')}
              disabled={translating === lang || !apiKey}
              className="gap-1.5"
            >
              {translating === lang ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t('protocols.generating')}
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('protocols.aiTranslate')}
                </>
              )}
            </Button>
            {!apiKey && (
              <p className="text-xs text-warning mt-2">
                {t('protocols.apiKeyMissingHint')}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-sm p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Paperclip className="w-4 h-4" />
          {t('protocols.attachments')}
        </h2>
        {!protocol.attachments || protocol.attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('protocols.noAttachments')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {protocol.attachments.map((att, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 border border-border rounded-sm bg-background"
              >
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-mono">{att.fileName}</span>
                </div>
                <span className="text-xs text-muted-foreground">{att.fileType}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t('protocols.editProtocol')}</DialogTitle>
          </DialogHeader>
          <ProtocolForm
            mode="edit"
            initialData={protocol}
            submitting={submitting}
            onSubmit={handleEdit}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('protocols.deleteConfirm')}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={handleDelete}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProtocolDetailPage;

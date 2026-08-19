import { useState, useRef } from 'react';
import { useTranslation } from '@client/src/stores/i18nStore';
import { useApiConfigStore } from '@client/src/stores/apiConfigStore';
import { protocolsApi } from '@client/src/api';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import { Label } from '@client/src/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@client/src/components/ui/tabs';
import type { ExpType, Protocol } from '@shared/types';
import {
  Upload,
  FileText,
  Sparkles,
  Loader2,
  X,
  AlertCircle,
  Languages,
} from 'lucide-react';
import { toast } from 'sonner';

const EXP_TYPES: ExpType[] = [
  'IHC',
  'WB',
  'qPCR',
  'cell_culture',
  'siRNA',
  'flow',
  'other',
];

interface ProtocolFormData {
  name: string;
  nameEn: string;
  type: ExpType;
  description: string;
  descriptionEn: string;
  content: string;
  contentEn: string;
  sourceLang: 'zh' | 'en';
}

interface ProtocolFormProps {
  initialData?: Protocol;
  onSubmit: (data: ProtocolFormData) => Promise<void>;
  submitting: boolean;
  mode?: 'create' | 'edit';
}

export function ProtocolForm({
  initialData,
  onSubmit,
  submitting,
  mode = 'create',
}: ProtocolFormProps) {
  const { t, lang } = useTranslation();
  const { apiBaseUrl, apiKey, modelName, preferred } = useApiConfigStore();

  const hasApiConfig =
    (preferred && apiKey) || (!preferred && modelName !== undefined);

  const [form, setForm] = useState<ProtocolFormData>({
    name: initialData?.name || '',
    nameEn: initialData?.nameEn || '',
    type: initialData?.type || 'WB',
    description: initialData?.description || '',
    descriptionEn: initialData?.descriptionEn || '',
    content: initialData?.content || '',
    contentEn: initialData?.contentEn || '',
    sourceLang: initialData?.sourceLang || 'zh',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedText, setParsedText] = useState('');
  const [parsedLang, setParsedLang] = useState<'zh' | 'en'>('zh');
  const [uploadError, setUploadError] = useState('');

  const updateField = <K extends keyof ProtocolFormData>(
    key: K,
    value: ProtocolFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const ext = file.name.toLowerCase().split('.').pop() || '';
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      setUploadError(t('protocols.unsupportedFormat'));
      return;
    }
    setUploadError('');
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setUploadError(t('protocols.fileTooLarge'));
      return;
    }
    setUploading(true);
    setFileName(file.name);
    try {
      const result = await protocolsApi.uploadProtocolFile(file);
      setParsedText(result.text);
      setParsedLang(result.detectedLang);
      toast.success(t('protocols.parseSuccess'));
    } catch (error) {
      const msg =
        (error as { response?: { data?: { message?: string } } }).response
          ?.data?.message || t('protocols.parseFailed');
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleAiParse = async () => {
    if (!parsedText.trim()) return;
    if (!apiKey) {
      toast.error(t('protocols.apiKeyMissing'));
      return;
    }
    setParsing(true);
    try {
      const result = await protocolsApi.aiParseProtocol({
        text: parsedText,
        apiBaseUrl,
        apiKey,
        modelName,
        sourceLang: parsedLang,
      });
      setForm({
        name: result.title,
        nameEn: result.titleEn,
        type: result.type,
        description: result.summary,
        descriptionEn: result.summaryEn,
        content: result.content,
        contentEn: result.contentEn,
        sourceLang: result.sourceLang,
      });
      toast.success(t('protocols.aiParseSuccess'));
    } catch (error) {
      const msg =
        (error as { response?: { data?: { message?: string } } }).response
          ?.data?.message || t('protocols.aiParseFailed');
      toast.error(msg);
    } finally {
      setParsing(false);
    }
  };

  const handleClearFile = () => {
    setFileName('');
    setParsedText('');
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canSubmit =
    form.name.trim() && form.content.trim() && form.type;

  return (
    <div className="flex flex-col gap-4 py-2 max-h-[80vh] overflow-y-auto pr-1">
      {mode === 'create' && (
        <div className="border border-border rounded-sm p-4 bg-accent/20">
          <div className="flex items-center gap-2 mb-2">
            <Upload className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {t('protocols.uploadFile')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {t('protocols.uploadHint')}
          </p>
          <div
            className="border-2 border-dashed border-border rounded-sm p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-background/50 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleFileSelect}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  {t('protocols.parsing')}
                </span>
              </div>
            ) : fileName ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span className="text-sm font-mono">{fileName}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearFile();
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {t('protocols.dropOrClick')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('protocols.supportedFormats')}
                </span>
              </div>
            )}
          </div>
          {uploadError && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5" />
              {uploadError}
            </div>
          )}
          {parsedText && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {t('protocols.parsedChars', { count: parsedText.length })}
              </span>
              <Button
                size="sm"
                onClick={handleAiParse}
                disabled={parsing || !apiKey}
                className="gap-1.5"
              >
                {parsing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t('protocols.aiParsing')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('protocols.aiExtract')}
                  </>
                )}
              </Button>
            </div>
          )}
          {!apiKey && mode === 'create' && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-warning">
              <AlertCircle className="w-3.5 h-3.5" />
              {t('protocols.apiKeyMissingHint')}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label>{t('protocols.type')} *</Label>
        <Select
          value={form.type}
          onValueChange={(v: string) => updateField('type', v as ExpType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXP_TYPES.map((type: ExpType) => (
              <SelectItem key={type} value={type}>
                {t(`expType.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue={form.sourceLang} value={form.sourceLang} onValueChange={(v) => updateField('sourceLang', v as 'zh' | 'en')}>
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">
            {t('protocols.name')} *
          </Label>
          <TabsList className="h-7">
            <TabsTrigger value="zh" className="text-xs h-6 px-2">
              中文
            </TabsTrigger>
            <TabsTrigger value="en" className="text-xs h-6 px-2">
              EN
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="zh" className="mt-1">
          <Input
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder={t('protocols.namePlaceholder')}
          />
        </TabsContent>
        <TabsContent value="en" className="mt-1">
          <Input
            value={form.nameEn}
            onChange={(e) => updateField('nameEn', e.target.value)}
            placeholder={t('protocols.namePlaceholderEn')}
          />
        </TabsContent>
      </Tabs>

      <Tabs defaultValue="zh">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">
            {t('protocols.summary')}
          </Label>
          <TabsList className="h-7">
            <TabsTrigger value="zh" className="text-xs h-6 px-2">
              中文
            </TabsTrigger>
            <TabsTrigger value="en" className="text-xs h-6 px-2">
              EN
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="zh" className="mt-1">
          <Textarea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder={t('protocols.summaryPlaceholder')}
            rows={2}
          />
        </TabsContent>
        <TabsContent value="en" className="mt-1">
          <Textarea
            value={form.descriptionEn}
            onChange={(e) => updateField('descriptionEn', e.target.value)}
            placeholder={t('protocols.summaryPlaceholderEn')}
            rows={2}
          />
        </TabsContent>
      </Tabs>

      <Tabs defaultValue="zh">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">
            {t('protocols.content')} *
          </Label>
          <TabsList className="h-7">
            <TabsTrigger value="zh" className="text-xs h-6 px-2">
              中文
            </TabsTrigger>
            <TabsTrigger value="en" className="text-xs h-6 px-2">
              EN
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="zh" className="mt-1">
          <Textarea
            value={form.content}
            onChange={(e) => updateField('content', e.target.value)}
            placeholder={t('protocols.contentPlaceholder')}
            rows={10}
            className="font-mono text-sm"
          />
        </TabsContent>
        <TabsContent value="en" className="mt-1">
          <Textarea
            value={form.contentEn}
            onChange={(e) => updateField('contentEn', e.target.value)}
            placeholder={t('protocols.contentPlaceholderEn')}
            rows={10}
            className="font-mono text-sm"
          />
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Languages className="w-3.5 h-3.5" />
          {t('protocols.sourceLang', { lang: form.sourceLang === 'zh' ? '中文' : 'English' })}
        </span>
        <Button
          type="button"
          variant="default"
          disabled={submitting || !canSubmit}
          onClick={() => onSubmit(form)}
        >
          {submitting ? t('common.loading') : t('common.save')}
        </Button>
      </div>
    </div>
  );
}

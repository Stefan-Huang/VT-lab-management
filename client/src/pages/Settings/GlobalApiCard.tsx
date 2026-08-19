import { useState, useEffect } from 'react';
import { useTranslation } from '@client/src/stores/i18nStore';
import { useAuthStore } from '@client/src/stores/authStore';
import { settingsApi } from '@client/src/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import { Badge } from '@client/src/components/ui/badge';
import { MaskedInput } from '@client/src/components/MaskedInput';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { ApiTestResponse } from '@shared/types';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type TestState = 'idle' | 'testing' | 'success' | 'error';

export function GlobalApiCard() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const [form, setForm] = useState({
    apiBaseUrl: '',
    apiKey: '',
    modelName: '',
    adminPassword: '',
  });
  const [testState, setTestState] = useState<TestState>('idle');
  const [testResult, setTestResult] = useState<ApiTestResponse | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [fieldResetKey, setFieldResetKey] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    settingsApi
      .getGlobalApiConfig()
      .then((cfg) => {
        setForm((f) => ({
          ...f,
          apiBaseUrl: cfg.apiBaseUrl,
          apiKey: cfg.apiKey,
          modelName: cfg.modelName,
        }));
      })
      .catch((err) => logger.error('load global api config failed', err));
  }, [isAdmin]);

  const handleTest = async () => {
    if (!form.apiBaseUrl || !form.apiKey || !form.modelName) return;
    setTestState('testing');
    setTestResult(null);
    try {
      const result = await settingsApi.testApiConnection({
        apiBaseUrl: form.apiBaseUrl,
        apiKey: form.apiKey,
        modelName: form.modelName,
      });
      setTestResult(result);
      setTestState(result.success ? 'success' : 'error');
    } catch (err) {
      setTestResult({
        success: false,
         message: (err as Error).message || t('common.requestFailed'),
        latencyMs: 0,
      });
      setTestState('error');
    }
  };

  const handleSave = async () => {
    setSaveError('');
    try {
      await settingsApi.saveGlobalApiConfig(form);
      setSaved(true);
      setFieldResetKey((k) => k + 1);
      setForm((f) => ({ ...f, adminPassword: '' }));
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message || (err as Error).message;
      setSaveError(msg);
    }
  };

  if (!isAdmin) return null;

  return (
    <Card className="border-border shadow-none rounded-sm">
      <CardHeader className="p-4 pb-3 space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {t('settings.globalApi')}
          </CardTitle>
          <Badge variant="default" className="text-xs rounded-full">
            {t('settings.roleAdmin')}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          {t('settings.globalApiDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3" key={fieldResetKey}>
        <div className="space-y-1.5">
          <Label className="text-xs">{t('settings.apiBaseUrl')}</Label>
          <MaskedInput
            type="url"
            value={form.apiBaseUrl}
            onChange={(val) => setForm({ ...form, apiBaseUrl: val })}
            placeholder="https://api.example.com/v1"
            maskMode="dots"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t('settings.apiKey')}</Label>
          <MaskedInput
            type="password"
            value={form.apiKey}
            onChange={(val) => setForm({ ...form, apiKey: val })}
            placeholder="sk-..."
            maskMode="partial"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t('settings.modelName')}</Label>
          <MaskedInput
            type="text"
            value={form.modelName}
            onChange={(val) => setForm({ ...form, modelName: val })}
            placeholder="gpt-4o-mini"
            maskMode="dots"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">
            {t('settings.adminPassword')}
            <span className="text-muted-foreground font-normal ml-1">
              ({t('settings.adminPasswordHint')})
            </span>
          </Label>
          <Input
            type="password"
            value={form.adminPassword}
            onChange={(e) =>
              setForm({ ...form, adminPassword: e.target.value })
            }
            className="font-mono text-sm h-9 rounded-sm"
          />
        </div>

        {testState !== 'idle' && testResult && (
          <div
            className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-sm border ${
              testState === 'success'
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}
          >
            {testState === 'success' ? (
              <CheckCircle2 size={14} />
            ) : (
              <XCircle size={14} />
            )}
            <span className="font-medium">
              {testState === 'success'
                ? t('settings.testSuccess')
                : t('settings.testFailed')}
            </span>
            <span className="font-mono ml-auto">
              {t('settings.latency')}: {testResult.latencyMs}ms
            </span>
          </div>
        )}
        {testState === 'error' && testResult && (
          <p className="text-xs text-destructive break-words">
            {testResult.message}
          </p>
        )}
        {saveError && (
          <p className="text-xs text-destructive break-words">{saveError}</p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleTest}
            disabled={
              testState === 'testing' ||
              !form.apiBaseUrl ||
              !form.apiKey ||
              !form.modelName
            }
            className="rounded-sm"
          >
            {testState === 'testing' ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t('settings.testing')}
              </>
            ) : (
              t('settings.testConnection')
            )}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!form.adminPassword}
            className="rounded-sm"
          >
            {t('settings.saveGlobal')}
          </Button>
          {saved && (
            <span className="text-xs text-success flex items-center gap-1">
              <CheckCircle2 size={14} />
              {t('settings.saved')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

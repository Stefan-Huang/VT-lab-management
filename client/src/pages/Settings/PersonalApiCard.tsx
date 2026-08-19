import { useState, useEffect } from 'react';
import { useTranslation } from '@client/src/stores/i18nStore';
import { useAuthStore } from '@client/src/stores/authStore';
import { useApiConfigStore } from '@client/src/stores/apiConfigStore';
import { settingsApi } from '@client/src/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import { Button } from '@client/src/components/ui/button';
import { Switch } from '@client/src/components/ui/switch';
import { Label } from '@client/src/components/ui/label';
import { Badge } from '@client/src/components/ui/badge';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { ApiTestResponse } from '@shared/types';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { MaskedInput } from '@client/src/components/MaskedInput';

type TestState = 'idle' | 'testing' | 'success' | 'error';

export function PersonalApiCard() {
  const { t } = useTranslation();
  const {
    apiBaseUrl,
    apiKey,
    modelName,
    preferred,
    saveConfig,
    togglePreferred,
  } = useApiConfigStore();

  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const [form, setForm] = useState({ apiBaseUrl, apiKey, modelName });
  const [testState, setTestState] = useState<TestState>('idle');
  const [testResult, setTestResult] = useState<ApiTestResponse | null>(null);
  const [saved, setSaved] = useState(false);
  const [fieldResetKey, setFieldResetKey] = useState(0);

  useEffect(() => {
    setForm({ apiBaseUrl, apiKey, modelName });
  }, [apiBaseUrl, apiKey, modelName]);

  const handleTest = async () => {
    if (!form.apiBaseUrl || !form.apiKey || !form.modelName) return;
    setTestState('testing');
    setTestResult(null);
    try {
      const result = await settingsApi.testApiConnection(form);
      setTestResult(result);
      setTestState(result.success ? 'success' : 'error');
    } catch (err) {
      logger.error('test personal api failed', err);
      setTestResult({
        success: false,
         message: (err as Error).message || t('common.requestFailed'),
        latencyMs: 0,
      });
      setTestState('error');
    }
  };

  const handleSave = () => {
    saveConfig(form);
    setSaved(true);
    setFieldResetKey((k) => k + 1);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card className="border-border shadow-none rounded-sm">
      <CardHeader className="p-4 pb-3 space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {t('settings.personalApi')}
          </CardTitle>
          <Badge variant="outline" className="text-xs font-mono rounded-full">
            local
          </Badge>
        </div>
        <CardDescription className="text-xs">
          {t('settings.personalApiDesc')}
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

        <div className="flex items-center justify-between py-1">
          <Label className="text-xs cursor-pointer" htmlFor="personal-prefer">
            {t('settings.preferPersonal')}
          </Label>
          <Switch
            id="personal-prefer"
            checked={preferred}
            onCheckedChange={togglePreferred}
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
          <Button size="sm" onClick={handleSave} className="rounded-sm">
            {t('settings.save')}
          </Button>
          {saved && (
            <span className="text-xs text-success flex items-center gap-1">
              <CheckCircle2 size={14} />
              {t('settings.saved')}
            </span>
          )}
        </div>
        {!isAdmin && (
          <p className="text-xs text-muted-foreground pt-2 border-t border-border flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
            {t('settings.globalApiManagedByAdmin')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

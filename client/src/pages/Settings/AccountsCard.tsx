import { useState, useEffect, useCallback } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { Account } from '@shared/types';
import { Loader2 } from 'lucide-react';

export function AccountsCard() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editing, setEditing] = useState<Account | null>(null);
  const [editForm, setEditForm] = useState({
    username: '',
    displayName: '',
    password: '',
    adminPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const loadAccounts = useCallback(() => {
    if (!isAdmin) return;
    settingsApi
      .getAccounts()
       .then((res) => setAccounts(res.accounts))
       .catch((err) => logger.error('load accounts failed', err));
  }, [isAdmin]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const openEdit = (account: Account) => {
    setEditing(account);
    setEditForm({
      username: account.username,
      displayName: account.displayName,
      password: '',
      adminPassword: '',
    });
    setSaveError('');
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setSaveError('');
    try {
      await settingsApi.updateAccount(editing.id, editForm);
      setEditing(null);
      loadAccounts();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message || (err as Error).message;
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <>
      <Card className="border-border shadow-none rounded-sm">
        <CardHeader className="p-4 pb-3 space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              {t('settings.accounts')}
            </CardTitle>
            <Badge variant="default" className="text-xs rounded-full">
              {t('settings.roleAdmin')}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            {t('settings.accountsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="border border-border rounded-sm overflow-hidden">
            <div className="grid grid-cols-12 px-3 py-2 bg-accent/30 text-xs font-medium text-muted-foreground">
              <div className="col-span-3">{t('settings.username')}</div>
              <div className="col-span-2">{t('settings.role')}</div>
              <div className="col-span-4">{t('settings.displayName')}</div>
              <div className="col-span-3 text-right">{t('common.edit')}</div>
            </div>
            {accounts.map((acc, idx) => (
              <div
                key={acc.id}
                className={`grid grid-cols-12 px-3 py-2 items-center text-sm border-t border-border ${
                  idx % 2 === 1 ? 'bg-accent/10' : ''
                }`}
              >
                <div className="col-span-3 font-mono">{acc.username}</div>
                <div className="col-span-2">
                  <Badge
                    variant={acc.role === 'admin' ? 'default' : 'outline'}
                    className="rounded-full text-xs"
                  >
                    {acc.role === 'admin'
                      ? t('settings.roleAdmin')
                      : t('settings.roleUser')}
                  </Badge>
                </div>
                <div className="col-span-4">{acc.displayName}</div>
                <div className="col-span-3 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(acc)}
                    className="rounded-sm h-7 px-2"
                  >
                    {t('common.edit')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-sm max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.editAccount')}</DialogTitle>
            <DialogDescription className="text-xs">
              {editing?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('settings.username')}</Label>
              <Input
                value={editForm.username}
                onChange={(e) =>
                  setEditForm({ ...editForm, username: e.target.value })
                }
                className="font-mono text-sm h-9 rounded-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('settings.displayName')}</Label>
              <Input
                value={editForm.displayName}
                onChange={(e) =>
                  setEditForm({ ...editForm, displayName: e.target.value })
                }
                className="text-sm h-9 rounded-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('settings.newPassword')}</Label>
              <Input
                type="password"
                value={editForm.password}
                onChange={(e) =>
                  setEditForm({ ...editForm, password: e.target.value })
                }
                className="font-mono text-sm h-9 rounded-sm"
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
                value={editForm.adminPassword}
                onChange={(e) =>
                  setEditForm({ ...editForm, adminPassword: e.target.value })
                }
                className="font-mono text-sm h-9 rounded-sm"
              />
            </div>
            {saveError && (
              <p className="text-xs text-destructive break-words">
                {saveError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(null)}
              className="rounded-sm"
            >
              {t('common.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !editForm.adminPassword}
              className="rounded-sm"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                t('common.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

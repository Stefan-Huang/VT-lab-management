import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/src/components/ui/form';
import { Input } from '@client/src/components/ui/input';
import { Button } from '@client/src/components/ui/button';
import { Alert, AlertDescription } from '@client/src/components/ui/alert';
import { User, Key } from 'lucide-react';
import { useTranslation } from '@client/src/stores/i18nStore';
import { useAuthStore } from '@client/src/stores/authStore';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { login } from '@client/src/api/auth';
import { Image } from '@client/src/components/ui/image';

const loginSchema = z.object({
  username: z.string().min(1, 'username_required'),
  password: z.string().min(1, 'password_required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');
    try {
      const result = await login(data.username, data.password);
      setUser(result.user);
      navigate('/materials', { replace: true });
    } catch (err: any) {
      logger.error('Login error', err);
      const message = err?.response?.data?.message || t('login.failed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md login-card-enter">
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-xl overflow-hidden bg-white shadow-md">
            <Image
              src="https://aka.doubaocdn.com/s/veJvWcV9YW"
              alt="VT Lab Logo"
              className="h-20 w-20 object-cover"
            />
          </div>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: '#1a365d' }}>VT Lab</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('login.subtitle')}</p>
      </div>

      <div className="rounded-sm border border-border/60 bg-white/80 backdrop-blur-sm p-6 shadow-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">
                    {t('login.username')}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9 font-mono"
                        placeholder={t('login.username')}
                        autoComplete="username"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">
                    {t('login.password')}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                       <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="password"
                        className="pl-9 font-mono"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? t('common.loading') : t('login.submit')}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default LoginPage;

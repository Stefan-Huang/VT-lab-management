import { useTranslation } from '@client/src/stores/i18nStore';
import { PersonalApiCard } from './PersonalApiCard';
import { GlobalApiCard } from './GlobalApiCard';
import { AccountsCard } from './AccountsCard';

const SettingsPage = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">{t('settings.title')}</h1>
      </div>
      <PersonalApiCard />
      <GlobalApiCard />
      <AccountsCard />
    </div>
  );
};

export default SettingsPage;

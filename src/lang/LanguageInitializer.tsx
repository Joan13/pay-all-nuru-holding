import { useAppSelector } from '@/src/store/app/hooks';
import { useEffect } from 'react';
import i18n from './i18nextConfig';

/**
 * Component that initializes i18n language from persisted state
 * This should be placed inside PersistGate to ensure persisted state is loaded
 */
export default function LanguageInitializer() {
  const persistedLanguage = useAppSelector(state => state.persisted_app.language);

  useEffect(() => {
    if (persistedLanguage && i18n.language !== persistedLanguage) {
      i18n.changeLanguage(persistedLanguage);
    }
  }, [persistedLanguage]);

  return null;
}


import IconApp from '@/src/components/app/IconApp';
import { DarkTheme, LightTheme } from '@/src/constants/Themes';
import { useAppDispatch, useAppSelector } from '@/src/store/app/hooks';
import { setLanguage } from '@/src/store/reducers/persistedAppSlice';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity } from 'react-native';
import i18n from './i18nextConfig';
import { LangCode } from './LanguageUtils';

export default function ChangeLanguage() {
  const theme = useAppSelector(state => state.persisted_app.theme);
  const persistedLanguage = useAppSelector(state => state.persisted_app.language);
  const dispatch = useAppDispatch();
  const { i18n: i18nInstance } = useTranslation();
  
  const currentLanguage = persistedLanguage || i18nInstance.language || LangCode.fr;

  const toggleLanguage = () => {
    const newLanguage = currentLanguage === LangCode.en ? LangCode.fr : LangCode.en;
    i18n.changeLanguage(newLanguage);
    dispatch(setLanguage(newLanguage));
  };

  return (
    <TouchableOpacity onPress={toggleLanguage}>
      <IconApp 
        pack="FI" 
        name="globe" 
        size={25} 
        color={theme === 'light' ? LightTheme.text : DarkTheme.text} 
        styles={{}} 
      />
    </TouchableOpacity>
  );
}


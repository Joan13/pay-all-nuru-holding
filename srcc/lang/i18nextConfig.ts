import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { LangCode } from './LanguageUtils';
import en from './locales/en.json';
import fr from './locales/fr.json';

const resources = {
    en: {
        translation: en,
    },
    fr: {
        translation: fr,
    },
};

const initializeI18Next = () => {
    i18n.use(initReactI18next).init({
        debug: false,
        resources,
        lng: LangCode.fr,
        fallbackLng: LangCode.fr,
        compatibilityJSON: 'v4',
        interpolation: {
            escapeValue: false,
        },
    });
};

// Initialize immediately when module is imported
initializeI18Next();

export default i18n;
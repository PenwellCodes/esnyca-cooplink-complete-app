import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translateText } from '../../utils/translate';

const LanguageContext = createContext(undefined);

const defaultLanguageContext = {
  currentLanguage: 'en',
  changeLanguage: async () => {},
  t: async (text) => (text === null || text === undefined ? text : String(text)),
  isLanguageReady: true,
};

export const useLanguage = () => useContext(LanguageContext) || defaultLanguageContext;

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLanguageReady, setIsLanguageReady] = useState(false);
  const translationCacheRef = useRef(new Map());

  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem('userLanguage');
        if (saved) setCurrentLanguage(saved);
      } catch (error) {
        console.error('Error loading language preference:', error);
      } finally {
        setIsLanguageReady(true);
      }
    };
    loadSavedLanguage();
  }, []);

  const changeLanguage = async (langCode) => {
    try {
      await AsyncStorage.setItem('userLanguage', langCode);
      setCurrentLanguage(langCode);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  const t = useCallback(
    async (text) => {
      if (text === null || text === undefined) return text;
      const input = String(text);
      if (!input.trim() || currentLanguage === 'en') return input;

      const cacheKey = `${currentLanguage}::${input}`;
      const cached = translationCacheRef.current.get(cacheKey);
      if (cached) return cached;

      const translated = await translateText(input, currentLanguage);
      translationCacheRef.current.set(cacheKey, translated);
      return translated;
    },
    [currentLanguage]
  );

  return (
    <LanguageContext.Provider
      value={{ currentLanguage, changeLanguage, t, isLanguageReady }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

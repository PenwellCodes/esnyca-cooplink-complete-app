import React, { createContext, useState, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translateText } from '../../utils/translate';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const changeLanguage = async (langCode) => {
    try {
      await AsyncStorage.setItem('userLanguage', langCode);
      setCurrentLanguage(langCode);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  const t = async (text) => {
    if (currentLanguage === 'en') return text;
    return await translateText(text, currentLanguage);
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

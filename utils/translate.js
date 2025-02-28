import { translate } from 'google-translate-api-x';

export const languages = {
  en: 'English',
  de: 'German'
};

// Add menu items to common translations
export const commonTranslations = {
  en: {
    Services: 'Services',
    'About Us': 'About Us',
    'Profile Updates': 'Profile Updates',
    Cooperatives: 'Cooperatives',
    News: 'News',
    Partnerships: 'Partnerships',
    Search: 'Search',
    esnyca: 'esnyca'
  },
  ss: {
    Services: 'Umsebenti',
    'About Us': 'Ngathi',
    'Profile Updates': 'Gchibisa Imininingwane',
    Cooperatives: 'Emabhizinisi',
    News: 'Tindzaba',
    Partnerships: 'Budlelwane',
    Search: 'Sesha',
    esnyca: 'esnyca'
  },
  // Add other languages as needed
};

export const translateText = async (text, targetLang) => {
  try {
    // First check if we have a predefined translation
    if (commonTranslations[targetLang]?.[text]) {
      return commonTranslations[targetLang][text];
    }
    
    // If not, use Google Translate
    const result = await translate(text, { to: targetLang });
    return result.text;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original text if translation fails
  }
};

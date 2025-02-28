import { translate } from 'google-translate-api-x';

export const languages = {
  en: 'English',
  de: 'German',
  ss: 'Swati',
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
    esnyca: 'esnyca',
    'LEGAL COMPLIANCE': 'Legal Compliance',
    'FINANCIAL SERVICES': 'Financial Services',
    'TRAINING AND DEVELOPMENT': 'Training and Development',
    'MARKETING AND PROMOTION': 'Marketing and Promotion',
    'RESEARCH AND INSIGHTS': 'Research and Insights',
    'More Information': 'More Information',
    'Legal compliance services for cooperatives': 'Legal compliance services for cooperatives',
    'Financial support and advisory services': 'Financial support and advisory services',
    'Update Profile': 'Update Profile',
    'Tap to change profile photo': 'Tap to change profile photo',
    'Name': 'Name',
    'Company Name': 'Company Name',
    'Phone Number': 'Phone Number',
    'Description': 'Description',
    'Location': 'Location',
    'Enter your name': 'Enter your name',
    'Enter cooperative name': 'Enter cooperative name',
    'Enter phone number': 'Enter phone number',
    'Enter business description': 'Enter business description',
    'Satellite View': 'Satellite View',
    'Standard View': 'Standard View',
    'Selected': 'Selected',
    'Loading profile data...': 'Loading profile data...',
  },
  ss: {
    Services: 'Umsebenti',
    'About Us': 'Ngathi',
    'Profile Updates': 'Gchibisa Imininingwane',
    Cooperatives: 'Emabhizinisi',
    News: 'Tindzaba',
    Partnerships: 'Budlelwane',
    Search: 'Sesha',
    esnyca: 'esnyca',
    'LEGAL COMPLIANCE': 'Kulungisa Kwemtsetfo',
    'FINANCIAL SERVICES': 'Umsebenti Wetimali',
    'TRAINING AND DEVELOPMENT': 'Kuceceshwa Nekutfutfuka',
    'MARKETING AND PROMOTION': 'Kutfengisa Nekukhulisa',
    'RESEARCH AND INSIGHTS': 'Kucwaninga Nekuvumbulula',
    'More Information': 'Lwati Lolunyenti',
    'Legal compliance services for cooperatives': 'Umsebenti wekulungisa kwemtsetfo wemabhizinisi',
    'Financial support and advisory services': 'Lusito lwetimali neteluleko',
    'Update Profile': 'Buyeketa Imininingwane',
    'Tap to change profile photo': 'Cindzetela kuntjintja sitfombe',
    'Name': 'Ligama',
    'Company Name': 'Ligama Lenkapani',
    'Phone Number': 'Inombolo Yemakhalekhikhini',
    'Description': 'Inchazelo',
    'Location': 'Indzawo',
    'Enter your name': 'Faka ligama lakho',
    'Enter cooperative name': 'Faka ligama lemabhizinisi',
    'Enter phone number': 'Faka inombolo yemakhalekhikhini',
    'Enter business description': 'Faka inchazelo yebhizinisi',
    'Satellite View': 'Umbuko Wesathelayithi',
    'Standard View': 'Umbuko Lovamile',
    'Selected': 'Kukhetsiwe',
    'Loading profile data...': 'Kulayisha imininingwane...',
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

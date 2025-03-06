// utils/searchScreens.js
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

// Static screens data
export const screens = [
  {
    name: 'LegalCompliance',
    title: 'Legal Compliance',
    screen: 'support', // Updated to match file name
    type: 'menu',
    icon: 'shield-checkmark',
    content: `
      Your trust our responsibility. 
      Staying compliant with regulatory standards is fundamental for maintaining user trust and organizational integrity

      Affiliation to Apex Body:
      Cooperatives should be affiliated with an apex body, which ensures representation, coordination, and advocacy within the sector. This provides resources, guidance, and a network of support to strengthen cooperative functions.

      Financial Statements:
      Regular audited financial statements ensure transparency and accountability.

      Cooperative Capital Fund:
      Maintaining proper capital structure and fund management.

      User Privacy:
      Protecting member information and maintaining confidentiality.

      Data Protection:
      Implementing robust security measures to protect cooperative data.

      Grievance Redressal:
      Established procedures for handling member complaints and disputes.
    `
  },
  {
    name: 'MarketingAndPromotion',
    title: 'Marketing and Promotion',
    screen: 'support', // Updated to match file name
    type: 'menu',
    icon: 'megaphone',
    content: `
      Marketing initiatives designed to amplify the impact of youth cooperatives.
      Annual Marketing Events, Media Outreach, Social Media Marketing.
      Creating value for customers and driving visibility in local markets.
    `
  },
  {
    name: 'FinancialServices',
    title: 'Financial Services',
    screen: 'support', // Updated to match file name
    type: 'menu',
    icon: 'cash',
    content: `
      Specialized financial services to support cooperative growth.
      Youth Fund for Cooperative Development, Investment Opportunities,
      Mentorship and Financial Advisory, Financial Literacy Programs.
    `
  },
  {
    name: 'Cooperatives',
    title: 'Cooperatives by Region',
    screen: 'Cooperatives',
    type: 'menu',
    icon: 'people',
    content: `
      Explore cooperatives in different regions of Eswatini.
      Hhohho, Manzini, Lubombo, Shiselweni regions.
    `
  },
  {
    name: 'OurStory',
    title: 'Our Story',
    screen: 'OurStory',
    type: 'menu',
    icon: 'book',
    content: `
      Since 2018, we've been on a journey to empower youth through cooperative development.
      History, Mission, Vision, and Core Values.
      Building a legacy of success through youth empowerment and sustainable development.
      Integrity, Empowerment, and Sustainability are our core values.
    `
  },
  {
    name: 'Partnerships',
    title: 'Our Partners',
    screen: 'Partnerships',
    type: 'menu',
    icon: 'people',
    content: `
      Eswatini Government, Ministry of Industry and Trade
      German Cooperative and Raiffeisen Confederation (DGRV)
      National Co-operatives Federation of Eswatini (NCFE)
      Eswatini Co-operative Development College (ECODEC)
      Capacity building and cooperative development partnerships
    `
  },
  {
    name: 'MeetTheTeam',
    title: 'Meet Our Team',
    screen: 'MeetTheTeam',
    type: 'menu',
    icon: 'people-circle',
    content: `
      Meet the dedicated team behind ESNYCA.
      Board members, management, and staff.
      Leadership and expertise in cooperative development.
    `
  },
  {
    name: 'MissionsAndVisions',
    title: 'Mission & Vision',
    screen: 'support',
    type: 'menu',
    icon: 'telescope',
    content: `
      Vision: To be a dynamic and influential corporate body empowering youth-led enterprises.
      Mission: Empowering young entrepreneurs through cooperative alliances.
      Core Values: Integrity, Collaboration, Sustainability.
      Fostering socio-economic growth and innovation.
    `
  },
  {
    name: 'Cooperatives',
    title: 'Regional Cooperatives',
    screen: 'cooperatives',
    type: 'menu',
    icon: 'business',
    content: `
      Explore cooperatives across Eswatini regions:
      Hhohho Region Cooperatives
      Manzini Region Cooperatives
      Lubombo Region Cooperatives
      Shiselweni Region Cooperatives
      Youth-led cooperative enterprises and initiatives
    `
  },
  {
    name: 'ResearchAndInsights',
    title: 'Research and Insights',
    screen: 'support',
    type: 'menu',
    icon: 'analytics',
    content: `
      Guidance Research, Matchmaking Services, Linkable Businesses.
      Market research, competitive assessments, and trend analyses.
      Connecting youth cooperatives with potential partners and investors.
      Identifying complementary businesses for cooperative activities.
    `
  },
  {
    name: 'PrivacyPolicy',
    title: 'Privacy Policy',
    screen: 'settings', // Updated to match file name
    type: 'menu',
    icon: 'shield',
    content: `
      Privacy policy explaining data collection, use, and protection.
      User rights, data security, and contact information.
      Sections on data collection, data use, data protection, and user rights.
    `
  },
  {
    name: 'TrainingAndDevelopment',
    title: 'Training and Development',
    screen: 'support',
    type: 'menu',
    icon: 'school',
    content: `
      Workshops and Skill Development for youth cooperatives.
      Ongoing Advisory Services for business optimization.
      Success Stories of transformed youth cooperatives.
      Topics including financial literacy, cooperative management, and business innovation.
    `
  },
  {
    name: 'Settings',
    title: 'Settings',
    screen: 'settings', // Updated to match file name
    type: 'menu',
    icon: 'settings',
    content: `
      App settings including profile management, language preferences, and privacy settings.
      Dark mode toggle, help center access, and app update information.
      Invite friends feature and account management options.click
    `
  }
];

const getIconForScreen = (screenName) => {
  const iconMap = {
    OurStory: 'book',
    Partnerships: 'people',
    MeetTheTeam: 'people-circle',
    MissionsAndVisions: 'telescope',
    Cooperatives: 'business',
    LegalCompliance: 'shield-checkmark',
    MarketingAndPromotion: 'megaphone',
    FinancialServices: 'cash',
    ResearchAndInsights: 'analytics',
    PrivacyPolicy: 'shield',
    TrainingAndDevelopment: 'school',
    Settings: 'settings',
  };
  return iconMap[screenName] || 'document-text';
};

// Search through static screens
export const searchScreens = (query) => {
  if (!query) return [];
  
  const searchTerm = query.toLowerCase().trim();
  
  return screens.filter(screen => {
    const nameMatch = screen.name.toLowerCase().includes(searchTerm);
    const contentMatch = screen.content.toLowerCase().includes(searchTerm);
    const titleMatch = screen.title?.toLowerCase().includes(searchTerm);
    
    // Region matching for cooperatives
    const regionMatch = screen.name === 'Cooperatives' && (
      ['hhohho', 'manzini', 'lubombo', 'shiselweni'].some(region => 
        region.includes(searchTerm)
      )
    );
    
    return nameMatch || contentMatch || titleMatch || regionMatch;
  }).map(screen => ({
    ...screen,
    type: 'menu',
    icon: getIconForScreen(screen.name),
    params: screen.params || {}
  }));
};

// Search both static screens and the database
export const searchScreensAndDatabase = async (searchTerm) => {
  if (!searchTerm) return [];

  const lowerSearchTerm = searchTerm.toLowerCase().trim();
  
  // Search static screens
  const staticResults = searchScreens(lowerSearchTerm);

  // Search database
  const dbResults = await searchDatabase(lowerSearchTerm);

  // Combine and remove duplicates based on id
  const combinedResults = [...staticResults, ...dbResults];
  const uniqueResults = Array.from(new Map(combinedResults.map(item => [item.id, item])).values());
  return uniqueResults;
};

// Database search function (manual filtering after fetching full collections)
const searchDatabase = async (searchTerm) => {
  console.log('Starting database search for:', searchTerm);
  const results = [];
  const lowerSearchTerm = searchTerm.toLowerCase().trim();

  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.role === 'cooperative') {
        const isMatch = 
          (data.displayName?.toLowerCase().includes(lowerSearchTerm)) ||
          (data.email?.toLowerCase().includes(lowerSearchTerm)) ||
          (data.physicalAddress?.toLowerCase().includes(lowerSearchTerm)) ||
          (data.registrationNumber?.toLowerCase().includes(lowerSearchTerm)) ||
          (data.content?.toLowerCase().includes(lowerSearchTerm)) || // Add content field check
          (data.region?.toLowerCase().includes(lowerSearchTerm));
        
        if (isMatch) {
          results.push({
            id: doc.id,
            name: data.displayName || 'Unnamed Cooperative',
            title: data.displayName || 'Unnamed Cooperative',
            screen: 'cooperatives',
            type: 'cooperative',
            icon: 'business',
            content: data.content || '', // Include content field
            region: data.region || 'Unknown Region',
            params: { 
              selectedRegion: data.region || 'All',
              cooperativeId: doc.id,
              highlightId: doc.id
            }
          });
        }
      }
    });
    
    return results;
  } catch (error) {
    console.error('Database search failed:', error);
    return [];
  }
};

// Add new function for product/service search
export const searchProductsAndServices = async (searchTerm) => {
  console.log('Searching products/services for:', searchTerm);
  const results = [];
  const lowerSearchTerm = searchTerm.toLowerCase().trim();

  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.role === 'cooperative' && data.content) {
        const contentMatch = data.content.toLowerCase().includes(lowerSearchTerm);
        
        if (contentMatch) {
          results.push({
            id: doc.id,
            name: data.displayName || 'Unnamed Cooperative',
            content: data.content,
            region: data.region || 'Unknown Region',
            profilePic: data.profilePic,
            email: data.email,
            phoneNumber: data.phoneNumber,
            physicalAddress: data.physicalAddress
          });
        }
      }
    });
    
    return results;
  } catch (error) {
    console.error('Product/service search failed:', error);
    return [];
  }
};

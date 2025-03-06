import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { searchScreensAndDatabase, searchProductsAndServices } from '../../utils/searchScreen';

const HomeScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      // Check if this is a product/service search
      if (searchQuery.toLowerCase().startsWith('product:') || 
          searchQuery.toLowerCase().startsWith('service:')) {
        const query = searchQuery.split(':')[1].trim();
        const results = await searchProductsAndServices(query);
        router.push({
          pathname: '/(screens)/product-services-result',
          params: {
            searchQuery: query,
            results: JSON.stringify(results),
          },
        });
      } else {
        // Handle regular search as before
        const results = await searchScreensAndDatabase(searchQuery);
        router.push({
          pathname: '/(screens)/search-results',
          params: {
            searchQuery: searchQuery,
            results: JSON.stringify(results),
          },
        });
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search..."
      />
      <button onClick={handleSearch}>Search</button>
    </div>
  );
};

export default HomeScreen;

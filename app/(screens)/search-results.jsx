import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';

const SearchResults = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const searchQuery = params.searchQuery;
  const results = JSON.parse(params.results || '[]');

  const handleResultPress = (item) => {
    if (!item?.screen) return;

    try {
      console.log('Navigating to:', item.screen); // Debug log
      
      // Handle different types of screens
      if (item.type === 'cooperative') {
        router.push({
          pathname: `/(screens)/${item.screen.toLowerCase()}`,
          params: item.params
        });
      } else {
        // For menu items, try different path patterns
        const screenPath = item.screen.toLowerCase();
        if (screenPath === 'settings') {
          router.push('/(tabs)/settings');
        } else if (screenPath === 'privacy-policy') {
          // Open external URL for privacy policy
          Linking.openURL('https://esnyaca.pages.dev');
        } else {
          router.push(`/(screens)/${screenPath}`);
        }
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Could not navigate to the selected screen');
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.resultItem, { borderBottomColor: colors.disabled }]} 
      onPress={() => handleResultPress(item)}
    >
      <View style={styles.resultContent}>
        <Ionicons name={item.icon || 'document-text'} size={24} color={colors.primary} />
        <View style={styles.textContainer}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            {item.title || item.name}
          </Text>
          {item.content && (
            <Text 
              style={[styles.resultSubtitle, { color: colors.disabled }]} 
              numberOfLines={2}
            >
              {item.content}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {results.length === 0 ? (
        <Text style={[styles.noResultsText, { color: colors.text }]}>
          No results found for "{searchQuery}"
        </Text>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.id || `${item.name}-${index}`}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  resultItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
  },
  noResultsText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default SearchResults;

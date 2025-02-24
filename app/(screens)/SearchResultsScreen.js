// SearchResults.js
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useContext } from 'react';


const SearchResults = ({ route, navigation }) => {
  const { searchResults, searchQuery } = route.params;
  const { darkMode } = useContext(ThemeContext);

  const onResultPress = (item) => {
    if (!item || !item.screen) {
      Alert.alert("No screen associated with this item.");
      return;
    }

    if (item.role === 'cooperative') {
      navigation.navigate(item.screen, {
        cooperativeId: item.params?.cooperativeId,
        title: item.title
      });
    } else {
      navigation.navigate(item.screen);
    }
  };

  const renderItem = ({ item }) => {
    if (!item) return null;

    return (
      <TouchableOpacity style={styles.resultItem} onPress={() => onResultPress(item)}>
        <View style={styles.resultContent}>
          {item.iconLibrary === FontAwesome ? (
            <FontAwesome name={item.icon} size={24} color="#1E90FF" />
          ) : (
            <Ionicons name={item.icon} size={24} color="#1E90FF" />
          )}
          <View style={styles.textContainer}>
            <Text style={[styles.resultTitle, darkMode && styles.darkText]}>
              {item.type === 'menu' ? item.name : (item.title || item.companyName)}
            </Text>
            {(item.content) && (
              <Text style={[styles.resultSubtitle, darkMode && styles.darkText]} numberOfLines={2}>
                {item.content}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!searchResults || searchResults.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.noResultsText, darkMode && styles.darkText]}>
          No results found for "{searchQuery}"
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={searchResults}
        renderItem={renderItem}
        keyExtractor={(item, index) => {
          if (item.id) return item.id.toString();
          if (item.name) return `${item.name}-${index}`;
          return `item-${index}`;
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  resultItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  resultContent: { flexDirection: 'row', alignItems: 'center' },
  textContainer: { marginLeft: 10 },
  resultTitle: { fontSize: 16, fontWeight: 'bold' },
  resultSubtitle: { fontSize: 14, color: '#555' },
  darkText: { color: '#fff' },
  noResultsText: { fontSize: 18, textAlign: 'center', marginTop: 20 },
});

export default SearchResults;

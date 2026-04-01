import React from 'react';
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLanguage } from '../../context/appstate/LanguageContext';

const ProductServicesResult = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const results = JSON.parse(params.results || '[]');

  const { currentLanguage, t } = useLanguage();
  const [translations, setTranslations] = React.useState({
    productsServices: "Products & Services",
    productService: "Product/Service",
  });
  const [localizedResults, setLocalizedResults] = React.useState([]);

  React.useEffect(() => {
    const loadTranslations = async () => {
      setTranslations({
        productsServices: await t("Products & Services"),
        productService: await t("Product/Service"),
      });
    };
    loadTranslations();
  }, [currentLanguage, t]);

  React.useEffect(() => {
    const localizeResults = async () => {
      const translated = await Promise.all(
        results.map(async (item) => ({
          ...item,
          name: await t(item.name || ""),
          content: await t(item.content || ""),
          region: await t(item.region || ""),
        }))
      );
      setLocalizedResults(translated);
    };
    localizeResults();
  }, [results, currentLanguage, t]);
  
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.background }]}
      onPress={() => router.push({
        pathname: '/(screens)/cooperatives',
        params: { highlightId: item.id }
      })}
    >
      <Image 
        source={{ uri: item.profilePic || 'https://via.placeholder.com/150' }}
        style={styles.image}
      />
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.primary }]}>{item.name}</Text>
        <Text style={styles.serviceLabel}>
          {translations.productService}:
        </Text>
        <Text style={styles.service}>{item.content}</Text>
        <Text style={styles.region}>{item.region}</Text>
        <Text style={styles.contact}>{item.phoneNumber}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.primary }]}>
        {translations.productsServices} ({results.length})
      </Text>
      <FlatList
        data={localizedResults}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  list: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  serviceLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  service: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  region: {
    fontSize: 14,
    color: '#666',
  },
  contact: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  }
});

export default ProductServicesResult;
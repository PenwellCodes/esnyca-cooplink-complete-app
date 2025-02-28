import React, { useState, useEffect } from "react";
import { View, FlatList, TouchableOpacity, Text, StyleSheet, ScrollView } from "react-native";
import { Appbar, Portal, Modal, Card, useTheme } from "react-native-paper";
import { useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome, Ionicons } from "@expo/vector-icons";
import { useLanguage } from '../../context/appstate/LanguageContext';

const services = [
  {
    id: "1",
    title: "LEGAL COMPLIANCE",
    titleKey: 'legalCompliance',
    icon: { library: "MaterialIcons", name: "gavel" },
    info: "Legal compliance services for cooperatives",
    infoKey: 'legalComplianceInfo'
  },
  {
    id: "2",
    title: "FINANCIAL SERVICES",
    titleKey: 'financialServices',
    icon: { library: "FontAwesome", name: "money" },
    info: "Financial support and advisory services",
    infoKey: 'financialServicesInfo'
  },
  {
    id: "3",
    title: "TRAINING AND DEVELOPMENT",
    titleKey: 'trainingAndDevelopment',
    icon: { library: "MaterialIcons", name: "school" },
    info: "Detailed information about Training and Development. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. [Dummy long text...]",
    infoKey: 'trainingAndDevelopmentInfo'
  },
  {
    id: "4",
    title: "MARKETING AND PROMOTION",
    titleKey: 'marketingAndPromotion',
    icon: { library: "Ionicons", name: "megaphone" },
    info: "Detailed information about Marketing and Promotion. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. [Dummy long text...]",
    infoKey: 'marketingAndPromotionInfo'
  },
  {
    id: "5",
    title: "RESEARCH AND INSIGHTS",
    titleKey: 'researchAndInsights',
    icon: { library: "MaterialIcons", name: "search" },
    info: "Detailed information about Research and Insights. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. [Dummy long text...]",
    infoKey: 'researchAndInsightsInfo'
  },
];

const ServiceScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [translations, setTranslations] = useState({
    screenTitle: 'Services',
    moreInfo: 'More Information',
    services: {}
  });
  const [selectedService, setSelectedService] = useState(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);

  // Load translations
  useEffect(() => {
    const loadTranslations = async () => {
      const translated = {
        screenTitle: await t('Services'),
        moreInfo: await t('More Information'),
        services: {}
      };

      // Translate service titles and info
      for (const service of services) {
        translated.services[service.id] = {
          title: await t(service.title),
          info: await t(service.info)
        };
      }
      
      setTranslations(translated);
    };

    loadTranslations();
  }, [t]);

  const openDrawer = (service) => {
    setSelectedService(service);
    setIsDrawerVisible(true);
  };

  const closeDrawer = () => {
    setIsDrawerVisible(false);
  };

  const renderIcon = (icon) => {
    switch (icon.library) {
      case "MaterialIcons":
        return (
          <MaterialIcons name={icon.name} size={40} color={colors.primary} />
        );
      case "FontAwesome":
        return (
          <FontAwesome name={icon.name} size={40} color={colors.primary} />
        );
      case "Ionicons":
        return <Ionicons name={icon.name} size={40} color={colors.primary} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
   
      {/* Grid of Service Cards */}
      <FlatList
        data={services}
        numColumns={3}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.flatListContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.menuItemContainer}
            onPress={() => openDrawer(item)}
          >
            <View style={[styles.menuItem, { borderColor: colors.error }]}>
              {renderIcon(item.icon)}
            </View>
            <Text style={[styles.menuText, { color: colors.tertiary }]}>
              {translations.services[item.id]?.title || item.title}
            </Text>
          </TouchableOpacity>
        )}
      />

      <Portal>
        <Modal
          visible={isDrawerVisible}
          onDismiss={closeDrawer}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView style={styles.drawerScroll}>
            <Text style={styles.drawerHeading}>
              {translations.moreInfo}
            </Text>
            {selectedService && (
              <>
                <Text style={styles.drawerTitle}>
                  {translations.services[selectedService.id]?.title || selectedService.title}
                </Text>
                <Card style={styles.cardCover}>
                  <Card.Cover source={{ uri: "https://picsum.photos/700" }} />
                </Card>
                <Text style={styles.drawerDescription}>
                  {translations.services[selectedService.id]?.info || selectedService.info}
                </Text>
              </>
            )}
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flatListContainer: {
    flexGrow: 1,
    padding: 16,
  },
  menuItemContainer: {
    flex: 1,
    alignItems: "flex-start", // changed from center to flex-start
    margin: 10,
  },
  menuItem: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 10,
  },
  menuText: {
    marginTop: 5,
    textAlign: "left",
    fontSize: 14,
    fontWeight: "bold",
  },
  modalContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "80%",
  },
  drawerScroll: {
    maxHeight: "100%",
  },
  drawerHeading: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  drawerDescription: {
    fontSize: 14,
    color: "#444",
    marginTop: 10,
  },
  cardCover: {
    marginBottom: 10,
  },
});

export default ServiceScreen;

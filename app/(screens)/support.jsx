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
    info: `Comprehensive legal compliance services for cooperatives, including regulatory guidance, documentation, and legal advisory support.     Your trust our responsibility. 
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
      Established procedures for handling member complaints and disputes.`,
    infoKey: 'legalComplianceInfo'
  },
  {
    id: "2",
    title: "FINANCIAL SERVICES",
    titleKey: 'financialServices',
    icon: { library: "FontAwesome", name: "money" },
    info: `
      Specialized financial services to support cooperative growth.
      Youth Fund for Cooperative Development, Investment Opportunities,
      Mentorship and Financial Advisory, Financial Literacy Programs.
    `,
    infoKey: 'financialServicesInfo'
  },
  {
    id: "3",
    title: "TRAINING AND DEVELOPMENT",
    titleKey: 'trainingAndDevelopment',
    icon: { library: "MaterialIcons", name: "school" },
    info:  `
    Workshops and Skill Development for youth cooperatives.
    Ongoing Advisory Services for business optimization.
    Success Stories of transformed youth cooperatives.
    Topics including financial literacy, cooperative management, and business innovation.
  `,
    infoKey: 'trainingAndDevelopmentInfo'
  },
  {
    id: "4",
    title: "MARKETING AND PROMOTION",
    titleKey: 'marketingAndPromotion',
    icon: { library: "Ionicons", name: "megaphone" },
    info:  `
    Marketing initiatives designed to amplify the impact of youth cooperatives.
    Annual Marketing Events, Media Outreach, Social Media Marketing.
    Creating value for customers and driving visibility in local markets.
  `,
    infoKey: 'marketingAndPromotionInfo'
  },
  {
    id: "5",
    title: "RESEARCH AND INSIGHTS",
    titleKey: 'researchAndInsights',
    icon: { library: "MaterialIcons", name: "search" },
    info: `
      Guidance Research, Matchmaking Services, Linkable Businesses.
      Market research, competitive assessments, and trend analyses.
      Connecting youth cooperatives with potential partners and investors.
      Identifying complementary businesses for cooperative activities.
    `,
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

  useEffect(() => {
    const loadTranslations = async () => {
      const translated = {
        screenTitle: await t('Services'),
        moreInfo: await t('More Information'),
        services: {}
      };
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
        return <MaterialIcons name={icon.name} size={40} color={colors.primary} />;
      case "FontAwesome":
        return <FontAwesome name={icon.name} size={40} color={colors.primary} />;
      case "Ionicons":
        return <Ionicons name={icon.name} size={40} color={colors.primary} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>  
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
          contentContainerStyle={[
            styles.modalContainer, 
            { backgroundColor: colors.background }
          ]}
        >
          <ScrollView style={styles.drawerScroll}>
            <Text style={[styles.drawerHeading, { color: colors.error }]}>
              {translations.moreInfo}
            </Text>
            {selectedService && (
              <>
                <Text style={[styles.drawerTitle, { color: colors.error }]}>
                  {translations.services[selectedService.id]?.title || selectedService.title}
                </Text>
                <Card style={styles.cardCover}>
                  <Card.Cover source={{ uri: "https://media.istockphoto.com/id/625736338/photo/stack-of-hands-showing-unity.jpg?s=612x612&w=0&k=20&c=20mAQjGRQ5XVKqHe2qFguqGZ4dwto6lxxinciCfnVI0=" }} />
                </Card>
                <Text style={[styles.drawerDescription, { color: colors.error }]}>
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
    alignItems: "center",
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
    textAlign: "center",
    fontSize: 14,
    fontWeight: "bold",
  },
  modalContainer: {
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
    marginTop: 10,
  },
  cardCover: {
    marginBottom: 10,
  },
});

export default ServiceScreen;
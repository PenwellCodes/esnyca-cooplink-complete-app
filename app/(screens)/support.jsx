import React, { useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Appbar, Portal, Modal, Card, useTheme } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons, FontAwesome, Ionicons } from "@expo/vector-icons";

const services = [
  {
    id: "1",
    title: "LEGAL COMPLIANCE",
    icon: { library: "MaterialIcons", name: "gavel" },
    info: "Detailed information about Legal Compliance. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. [Dummy long text...]",
  },
  {
    id: "2",
    title: "FINANCIAL SERVICES",
    icon: { library: "FontAwesome", name: "money" },
    info: "Detailed information about Financial Services. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. [Dummy long text...]",
  },
  {
    id: "3",
    title: "TRAINING AND DEVELOPMENT",
    icon: { library: "MaterialIcons", name: "school" },
    info: "Detailed information about Training and Development. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. [Dummy long text...]",
  },
  {
    id: "4",
    title: "MARKETING AND PROMOTION",
    icon: { library: "Ionicons", name: "megaphone" },
    info: "Detailed information about Marketing and Promotion. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. [Dummy long text...]",
  },
  {
    id: "5",
    title: "RESEARCH AND INSIGHTS",
    icon: { library: "MaterialIcons", name: "search" },
    info: "Detailed information about Research and Insights. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. [Dummy long text...]",
  },
];

const ServiceScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const [selectedService, setSelectedService] = useState(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);

  const openDrawer = (service) => {
    setSelectedService(service);
    setIsDrawerVisible(true);
  };

  const closeDrawer = () => {
    setIsDrawerVisible(false);
  };

  // Helper to render an icon based on the specified library
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
            <Text
              style={[
                styles.menuText,
                { color: colors.tertiary, textAlign: "left" },
              ]}
            >
              {item.title}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Bottom Drawer */}
      <Portal>
        <Modal
          visible={isDrawerVisible}
          onDismiss={closeDrawer}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView style={styles.drawerScroll}>
            <Text style={styles.drawerHeading}>More Information</Text>
            {selectedService && (
              <>
                <Text style={styles.drawerTitle}>{selectedService.title}</Text>
                <Card style={styles.cardCover}>
                  <Card.Cover source={{ uri: "https://picsum.photos/700" }} />
                </Card>
                <Text style={styles.drawerDescription}>
                  {selectedService.info}
                </Text>
              </>
            )}
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
};

export default ServiceScreen;

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

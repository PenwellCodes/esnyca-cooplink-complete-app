import React from "react";
import {
  SafeAreaView,
  FlatList,
  Image,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { Appbar, Card, useTheme } from "react-native-paper";
import {images} from "../../constants"

const Partnerships = ({ numColumns = 2 }) => {
  const { colors } = useTheme();
  const partners = [
    {
      id: "1",
      name: "Eswatini Government",
      image: "https://www.gov.sz/images/headers/logo.png#joomlaImage://local-images/headers/logo.png?width=161&height=113",
    },
    {
      id: "2",
      name: "The German Cooperative and Raiffeisen Confederation",
      image: "https://www.gov.sz/images/headers/logo.png#joomlaImage://local-images/headers/logo.png?width=161&height=113",
    },
    {
      id: "3",
      name: "National Co-operatives Federation of Eswatini",
      image: "https://www.gov.sz/images/headers/logo.png#joomlaImage://local-images/headers/logo.png?width=161&height=113",
    },
    {
      id: "4",
      name: "Eswatini Co-operative Development College",
      image: "https://www.gov.sz/images/headers/logo.png#joomlaImage://local-images/headers/logo.png?width=161&height=113",
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Appbar.Header style={{ backgroundColor: "#2196F3" }}>
        <Appbar.BackAction onPress={() => {}} />
        <Appbar.Content title="Partnerships" color="white" />
      </Appbar.Header>

      <FlatList
        key={`flatlist-${numColumns}`}
        data={partners}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: item.image }}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.name}>{item.name}</Text>
          </Card>
        )}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 10,
    alignItems: "center",
  },
  card: {
    flex: 1,
    margin: 8,
    height: 180,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  imageContainer: {
    width: "100%",
    height: 90,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "80%",
    height: "100%",
  },
  name: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    color: "#000",
    marginTop: 10,
  },
});

export default Partnerships;

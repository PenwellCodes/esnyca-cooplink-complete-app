import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { Map } from "../../components";

const location = () => {
  return (
    <View style={styles.container}>
      <Map />
    </View>
  );
};

export default location;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

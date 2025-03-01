import React, { useEffect, useState } from "react";
import { StyleSheet, View, Dimensions, Image, Text } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { Button } from "react-native-paper";

// Dummy cooperative company data
const dummyCompanies = [
  {
    id: 1,
    name: "Green Coop",
    logo: "https://via.placeholder.com/50",
    latitude: -26.49424626815744,
    longitude: 31.3789692632684,
  },
  {
    id: 2,
    name: "Blue Coop",
    logo: "https://via.placeholder.com/50",
    latitude: -26.495273686612666,
    longitude: 31.378695677959612,
  },
];

const MapComponent = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState(null);

  // Fetch user's location on mount
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Location permission denied");
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  // Fetch directions using Geoapify Routing API
  const fetchDirections = async (company) => {
    if (!userLocation) {
      console.log("User location not available");
      return;
    }

    const waypoints = `${userLocation.latitude},${userLocation.longitude}|${company.latitude},${company.longitude}`;
    const url = `https://api.geoapify.com/v1/routing?waypoints=${waypoints}&mode=drive&apiKey=27ef59367cfa475bbd56baf0a24ace66`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const coordinates = data.features[0].geometry.coordinates[0].map(
          ([lon, lat]) => ({
            latitude: lat,
            longitude: lon,
          }),
        );
        setRouteCoordinates(coordinates);
      } else {
        console.log("No route found");
      }
    } catch (error) {
      console.error("Error fetching directions:", error);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE} // Switch to Google Maps for 2D view
        initialRegion={{
          latitude: userLocation?.latitude || -26.49616666902512,
          longitude: userLocation?.longitude || 31.378416728232995,
          latitudeDelta: 0.005, // Zoom in closer
          longitudeDelta: 0.005, // Zoom in closer
        }}
      >
        {/* User location marker (optional, less prominent) */}
        {userLocation && (
          <Marker coordinate={userLocation} title="You are here">
            <View
              style={{
                width: 10, // Smaller size
                height: 10,
                borderRadius: 5,
                backgroundColor: "rgba(0, 0, 255, 0.5)", // Semi-transparent blue
              }}
            />
          </Marker>
        )}

        {/* Cooperative company markers with enhanced labels */}
        {dummyCompanies.map((company) => (
          <Marker
            key={company.id}
            coordinate={{
              latitude: company.latitude,
              longitude: company.longitude,
            }}
            onPress={() => setSelectedCompany(company)}
          >
            <View style={styles.markerWrapper}>
              <Image
                source={{ uri: company.logo }}
                style={styles.markerImage}
              />
              <Text style={styles.markerText}>{company.name}</Text>
            </View>
          </Marker>
        ))}

        {/* Route polyline */}
        {routeCoordinates && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#FF0000" // Red route line
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Drawer for selected company */}
      {selectedCompany && (
        <View style={styles.drawerContainer}>
          <Text>{selectedCompany.name}</Text>
          <Button
            mode="contained"
            onPress={() => fetchDirections(selectedCompany)}
          >
            Get Directions
          </Button>
          <Button
            mode="outlined"
            onPress={() => {
              setSelectedCompany(null);
              setRouteCoordinates(null);
            }}
          >
            Close
          </Button>
        </View>
      )}
    </View>
  );
};

export default MapComponent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height - 56,
    borderRadius: 16,
  },
  markerWrapper: {
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "red",
    overflow: "hidden",
    padding: 2,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  markerImage: {
    width: 50,
    height: 50,
  },
  markerText: {
    textAlign: "center",
    color: "#000",
    fontSize: 12, // Larger font for readability
    fontWeight: "bold", // Bold text like in the image
    backgroundColor: "rgba(255, 255, 255, 0.9)", // More opaque background
    padding: 2,
    position: "absolute",
    bottom: 2,
  },
  drawerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    elevation: 5,
  },
});

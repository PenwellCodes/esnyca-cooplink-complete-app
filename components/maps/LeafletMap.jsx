import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildLeafletHtml } from './leafletHtml';

const DEFAULT_CENTER = { latitude: -26.5225, longitude: 31.4659 };
const MAP_HTML = buildLeafletHtml();

function latitudeDeltaToZoom(latitudeDelta) {
  if (!latitudeDelta || latitudeDelta <= 0) return 13;
  return Math.round(Math.log2(360 / latitudeDelta));
}

const LeafletMap = forwardRef(function LeafletMap(
  {
    style,
    initialCenter = DEFAULT_CENTER,
    zoom = 13,
    mapType = 'standard',
    markers = [],
    userLocation = null,
    radius = 0,
    routeCoords = null,
    onMarkerPress,
    onLongPress,
    enableLongPress = false,
  },
  ref
) {
  const webViewRef = useRef(null);
  const readyRef = useRef(false);
  const pendingCommandsRef = useRef([]);

  const markersKey = useMemo(
    () => JSON.stringify(markers.map((m) => [m.id, m.latitude, m.longitude])),
    [markers]
  );

  const sendCommand = useCallback((command) => {
    const script = `window.handleCommand(${JSON.stringify(command)}); true;`;
    if (!readyRef.current) {
      pendingCommandsRef.current.push(command);
      return;
    }
    webViewRef.current?.injectJavaScript(script);
  }, []);

  const flushPending = useCallback(() => {
    const pending = pendingCommandsRef.current;
    pendingCommandsRef.current = [];
    pending.forEach((command) => {
      webViewRef.current?.injectJavaScript(
        `window.handleCommand(${JSON.stringify(command)}); true;`
      );
    });
  }, []);

  const buildInitCommand = useCallback(
    () => ({
      type: 'init',
      center: {
        lat: initialCenter?.latitude ?? DEFAULT_CENTER.latitude,
        lng: initialCenter?.longitude ?? DEFAULT_CENTER.longitude,
      },
      zoom,
      mapType,
      markers,
      userLocation,
      radius,
      routeCoords,
    }),
    [
      initialCenter?.latitude,
      initialCenter?.longitude,
      zoom,
      mapType,
      markersKey,
      userLocation?.latitude,
      userLocation?.longitude,
      radius,
      routeCoords,
    ]
  );

  useImperativeHandle(ref, () => ({
    animateToRegion(region) {
      const z = latitudeDeltaToZoom(region?.latitudeDelta);
      sendCommand({
        type: 'flyTo',
        latitude: region.latitude,
        longitude: region.longitude,
        zoom: z,
      });
    },
    flyTo(latitude, longitude, mapZoom = 14) {
      sendCommand({ type: 'flyTo', latitude, longitude, zoom: mapZoom });
    },
    fitToCoordinates(coords) {
      sendCommand({ type: 'fitBounds', coords });
    },
  }));

  const handleMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'ready') {
          readyRef.current = true;
          flushPending();
          return;
        }
        if (data.type === 'markerPress' && onMarkerPress) {
          onMarkerPress(data.marker);
        }
        if (data.type === 'longPress' && enableLongPress && onLongPress) {
          onLongPress({
            latitude: data.latitude,
            longitude: data.longitude,
          });
        }
      } catch {
        // ignore malformed messages
      }
    },
    [enableLongPress, flushPending, onLongPress, onMarkerPress]
  );

  useEffect(() => {
    if (!readyRef.current) return;
    sendCommand({
      type: 'update',
      mapType,
      markers,
      userLocation,
      radius,
      routeCoords,
    });
  }, [mapType, markersKey, userLocation, radius, routeCoords, sendCommand, markers]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: MAP_HTML }}
        style={styles.webview}
        onMessage={handleMessage}
        onLoadEnd={() => {
          sendCommand(buildInitCommand());
        }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        scrollEnabled={false}
        nestedScrollEnabled
        allowsInlineMediaPlayback
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#e8e8e8',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8e8e8',
  },
});

export default LeafletMap;

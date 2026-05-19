import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const LEAFLET_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .leaflet-container { background: #e5e5e5; font-family: system-ui, sans-serif; }
    .marker-pin {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid #191970;
      background: #fff center/cover no-repeat;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
    }
    .marker-pin.default {
      background: #191970;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      width: 24px;
      height: 24px;
      border: none;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const RN = window.ReactNativeWebView;
    let map, tileLayer, markersLayer, circleLayer, lineLayer;
    let currentMapType = null;
    let allowSelection = true;
    let longPressTimer = null;
    let longPressStart = null;

    function post(obj) {
      if (RN) RN.postMessage(JSON.stringify(obj));
    }

    function tileUrl(type) {
      if (type === 'satellite') {
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      }
      return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }

    function tileOptions(type) {
      if (type === 'satellite') return { maxZoom: 19, attribution: 'Tiles &copy; Esri' };
      return { maxZoom: 19, attribution: '&copy; OpenStreetMap' };
    }

    function initMap(data) {
      const center = data.center || [-26.5225, 31.4659];
      const zoom = data.zoom || 13;

      map = L.map('map', { zoomControl: true }).setView(center, zoom);
      currentMapType = data.mapType || 'standard';
      tileLayer = L.tileLayer(tileUrl(currentMapType), tileOptions(currentMapType)).addTo(map);
      markersLayer = L.layerGroup().addTo(map);
      circleLayer = null;
      lineLayer = null;

      map.on('click', function(e) {
        if (allowSelection) {
          post({ type: 'mapClick', latitude: e.latlng.lat, longitude: e.latlng.lng });
        }
      });

      map.on('mousedown touchstart', function(e) {
        if (!allowSelection) return;
        longPressStart = e.latlng;
        longPressTimer = setTimeout(function() {
          if (longPressStart) {
            post({
              type: 'mapLongPress',
              latitude: longPressStart.lat,
              longitude: longPressStart.lng,
            });
          }
        }, 700);
      });

      function cancelLongPress() {
        if (longPressTimer) clearTimeout(longPressTimer);
        longPressTimer = null;
        longPressStart = null;
      }
      map.on('mouseup touchend', cancelLongPress);
      map.on('dragstart zoomstart', cancelLongPress);
      map.on('touchmove', function(e) {
        if (e.originalEvent && e.originalEvent.touches && e.originalEvent.touches.length === 1) {
          cancelLongPress();
        }
      });

      applyData(data);
    }

    function markerIcon(m) {
      if (m.photoUrl) {
        return L.divIcon({
          className: '',
          html: '<div class="marker-pin" style="background-image:url(\\'' + m.photoUrl.replace(/'/g, '') + '\\')"></div>',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });
      }
      return L.divIcon({
        className: '',
        html: '<div class="marker-pin default"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });
    }

    function applyData(data) {
      if (!map) return;

      if (data.interactive !== undefined) {
        allowSelection = data.interactive !== false;
      }

      if (data.mapType && data.mapType !== currentMapType) {
        currentMapType = data.mapType;
        if (tileLayer) map.removeLayer(tileLayer);
        tileLayer = L.tileLayer(tileUrl(data.mapType), tileOptions(data.mapType)).addTo(map);
      }

      markersLayer.clearLayers();
      (data.markers || []).forEach(function(m) {
        const marker = L.marker([m.latitude, m.longitude], { icon: markerIcon(m) });
        if (m.title) marker.bindPopup('<b>' + escapeHtml(m.title) + '</b>' + (m.description ? '<br/>' + escapeHtml(m.description) : ''));
        marker.on('click', function() {
          post({ type: 'markerPress', id: m.id, latitude: m.latitude, longitude: m.longitude });
        });
        markersLayer.addLayer(marker);
      });

      if (circleLayer) {
        map.removeLayer(circleLayer);
        circleLayer = null;
      }
      if (data.circle && data.circle.center) {
        circleLayer = L.circle(
          [data.circle.center.latitude, data.circle.center.longitude],
          {
            radius: data.circle.radius || 1000,
            color: '#007AFF',
            fillColor: '#007AFF',
            fillOpacity: 0.2,
            weight: 2,
          }
        ).addTo(map);
      }

      if (lineLayer) {
        map.removeLayer(lineLayer);
        lineLayer = null;
      }
      if (data.polyline && data.polyline.length >= 2) {
        const latlngs = data.polyline.map(function(p) {
          return [p.latitude, p.longitude];
        });
        lineLayer = L.polyline(latlngs, { color: '#00AAFF', weight: 4 }).addTo(map);
      }

      if (data.userLocation) {
        const u = data.userLocation;
        L.circleMarker([u.latitude, u.longitude], {
          radius: 8,
          color: '#fff',
          weight: 2,
          fillColor: '#007AFF',
          fillOpacity: 1,
        }).addTo(markersLayer);
      }
    }

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    window.updateMap = function(json) {
      try {
        const data = typeof json === 'string' ? JSON.parse(json) : json;
        if (!map) {
          initMap(data);
        } else {
          applyData(data);
        }
        if (data.fitBounds && data.fitBounds.length >= 2) {
          const bounds = L.latLngBounds(
            data.fitBounds.map(function(p) { return [p.latitude, p.longitude]; })
          );
          map.fitBounds(bounds, { padding: [40, 40] });
        } else if (data.center && data.recenter) {
          const lat = Array.isArray(data.center) ? data.center[0] : data.center.latitude;
          const lng = Array.isArray(data.center) ? data.center[1] : data.center.longitude;
          map.setView([lat, lng], data.zoom || map.getZoom());
        }
      } catch (err) {
        post({ type: 'error', message: String(err) });
      }
    };

    window.addEventListener('message', function(e) {
      if (e.data) window.updateMap(e.data);
    });

    document.addEventListener('message', function(e) {
      if (e.data) window.updateMap(e.data);
    });
  </script>
</body>
</html>`;

const LeafletMap = forwardRef(function LeafletMap(
  {
    style,
    center,
    zoom = 13,
    markers = [],
    circle,
    polyline,
    mapType = 'standard',
    userLocation,
    interactive = true,
    onMarkerPress,
    onMapClick,
    onMapLongPress,
  },
  ref
) {
  const webRef = useRef(null);
  const readyRef = useRef(false);

  const mapPayload = useMemo(
    () => ({
      center: center
        ? [center.latitude, center.longitude]
        : [-26.5225, 31.4659],
      zoom,
      markers,
      circle,
      polyline,
      mapType,
      userLocation,
      interactive,
    }),
    [center, zoom, markers, circle, polyline, mapType, userLocation, interactive]
  );

  const pushUpdate = useCallback(
    (extra = {}) => {
      if (!webRef.current) return;
      const payload = { ...mapPayload, ...extra };
      webRef.current.injectJavaScript(
        `window.updateMap(${JSON.stringify(payload)}); true;`
      );
    },
    [mapPayload]
  );

  useEffect(() => {
    if (readyRef.current) {
      pushUpdate();
    }
  }, [pushUpdate]);

  useImperativeHandle(ref, () => ({
    recenter(coordinate, zoomLevel = 14) {
      pushUpdate({
        center: coordinate,
        recenter: true,
        zoom: zoomLevel,
      });
    },
    fitToCoordinates(coordinates) {
      pushUpdate({ fitBounds: coordinates });
    },
    setMapType(type) {
      pushUpdate({ mapType: type });
    },
  }));

  const handleMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'markerPress' && onMarkerPress) {
          onMarkerPress(data);
        } else if (data.type === 'mapClick' && onMapClick) {
          onMapClick({ latitude: data.latitude, longitude: data.longitude });
        } else if (data.type === 'mapLongPress' && onMapLongPress) {
          onMapLongPress({ latitude: data.latitude, longitude: data.longitude });
        }
      } catch {
        // ignore parse errors
      }
    },
    [onMarkerPress, onMapClick, onMapLongPress]
  );

  const handleLoad = useCallback(() => {
    readyRef.current = true;
    pushUpdate();
  }, [pushUpdate]);

  return (
    <View
      style={[styles.wrapper, style]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
    >
      <WebView
        ref={webRef}
        style={styles.webview}
        originWhitelist={['*']}
        source={{ html: LEAFLET_HTML }}
        onMessage={handleMessage}
        onLoadEnd={handleLoad}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mixedContentMode="always"
        androidLayerType="hardware"
        setSupportMultipleWindows={false}
        nestedScrollEnabled={Platform.OS === 'android'}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minHeight: 200,
    backgroundColor: '#e5e5e5',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});

export default LeafletMap;

/**
 * Self-contained Leaflet map HTML for react-native-webview.
 * Uses OpenStreetMap (standard) and Esri imagery (satellite) — no Google API key.
 */
export function buildLeafletHtml() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .leaflet-container { background: #e8e8e8; font-family: system-ui, sans-serif; }
    .photo-marker {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid #191970;
      object-fit: cover;
      background: #fff;
    }
    .default-marker {
      width: 14px;
      height: 14px;
      background: #191970;
      border: 2px solid #fff;
      border-radius: 50%;
      box-shadow: 0 1px 4px rgba(0,0,0,0.35);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = null;
    var baseLayers = {};
    var currentLayer = null;
    var markerLayer = null;
    var routeLayer = null;
    var userCircle = null;
    var userMarker = null;
    var longPressTimer = null;
    var longPressFired = false;

    function post(obj) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(obj));
      }
    }

    function initMap(center, zoom) {
      if (map) return;
      map = L.map('map', { zoomControl: true, attributionControl: true }).setView(
        [center.lat, center.lng],
        zoom || 13
      );

      baseLayers.standard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      });

      baseLayers.satellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Tiles &copy; Esri'
        }
      );

      currentLayer = baseLayers.standard;
      currentLayer.addTo(map);

      markerLayer = L.layerGroup().addTo(map);
      routeLayer = L.layerGroup().addTo(map);

      map.on('click', function(e) {
        if (longPressFired) {
          longPressFired = false;
          return;
        }
      });

      var container = map.getContainer();
      container.addEventListener('touchstart', onTouchStart, { passive: true });
      container.addEventListener('touchend', onTouchEnd);
      container.addEventListener('touchmove', onTouchEnd);
      container.addEventListener('touchcancel', onTouchEnd);

      post({ type: 'ready' });
    }

    function onTouchStart(e) {
      if (e.touches.length !== 1) return;
      var touch = e.touches[0];
      longPressFired = false;
      longPressTimer = setTimeout(function() {
        longPressFired = true;
        var point = map.mouseEventToContainerPoint({
          clientX: touch.clientX,
          clientY: touch.clientY
        });
        var latlng = map.containerPointToLatLng(point);
        post({ type: 'longPress', latitude: latlng.lat, longitude: latlng.lng });
      }, 550);
    }

    function onTouchEnd() {
      if (longPressTimer) clearTimeout(longPressTimer);
    }

    function setMapType(mapType) {
      if (!map) return;
      var next = mapType === 'satellite' ? baseLayers.satellite : baseLayers.standard;
      if (currentLayer) map.removeLayer(currentLayer);
      currentLayer = next;
      currentLayer.addTo(map);
    }

    function markerIcon(m) {
      if (m.photoUrl) {
        return L.divIcon({
          html: '<img class="photo-marker" src="' + m.photoUrl.replace(/"/g, '') + '" alt="" />',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          className: ''
        });
      }
      return L.divIcon({
        html: '<div class="default-marker"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        className: ''
      });
    }

    function updateMarkers(markers) {
      if (!markerLayer) return;
      markerLayer.clearLayers();
      (markers || []).forEach(function(m) {
        if (m.latitude == null || m.longitude == null) return;
        var marker = L.marker([m.latitude, m.longitude], { icon: markerIcon(m) });
        if (m.title) marker.bindPopup('<b>' + escapeHtml(m.title) + '</b>');
        marker.on('click', function() {
          post({ type: 'markerPress', marker: m });
        });
        marker.addTo(markerLayer);
      });
    }

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function updateUserLocation(loc, radius) {
      if (!map) return;
      if (userCircle) {
        map.removeLayer(userCircle);
        userCircle = null;
      }
      if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
      }
      if (!loc) return;

      userMarker = L.circleMarker([loc.latitude, loc.longitude], {
        radius: 8,
        color: '#007AFF',
        fillColor: '#007AFF',
        fillOpacity: 1,
        weight: 2
      }).addTo(map);

      if (radius && radius > 0) {
        userCircle = L.circle([loc.latitude, loc.longitude], {
          radius: radius,
          color: '#007AFF',
          fillColor: '#007AFF',
          fillOpacity: 0.2,
          weight: 2
        }).addTo(map);
      }
    }

    function updateRoute(coords) {
      if (!routeLayer) return;
      routeLayer.clearLayers();
      if (!coords || coords.length < 2) return;
      var latlngs = coords.map(function(c) {
        return [c.latitude, c.longitude];
      });
      L.polyline(latlngs, { color: '#00AAFF', weight: 4, opacity: 0.9 }).addTo(routeLayer);
    }

    function flyTo(lat, lng, zoom) {
      if (!map) return;
      map.flyTo([lat, lng], zoom || map.getZoom(), { duration: 0.6 });
    }

    function fitBounds(coords) {
      if (!map || !coords || coords.length === 0) return;
      var bounds = L.latLngBounds(
        coords.map(function(c) {
          return [c.latitude, c.longitude];
        })
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }

    window.handleCommand = function(cmd) {
      if (!cmd || !cmd.type) return;

      if (cmd.type === 'init') {
        initMap(cmd.center, cmd.zoom);
        setMapType(cmd.mapType || 'standard');
        updateMarkers(cmd.markers);
        updateUserLocation(cmd.userLocation, cmd.radius);
        updateRoute(cmd.routeCoords);
        return;
      }

      if (!map && cmd.type !== 'init') {
        initMap(cmd.center || { lat: -26.5225, lng: 31.4659 }, cmd.zoom || 6);
      }

      switch (cmd.type) {
        case 'update':
          if (cmd.mapType) setMapType(cmd.mapType);
          if (cmd.markers) updateMarkers(cmd.markers);
          updateUserLocation(cmd.userLocation, cmd.radius);
          updateRoute(cmd.routeCoords);
          break;
        case 'flyTo':
          flyTo(cmd.latitude, cmd.longitude, cmd.zoom);
          break;
        case 'fitBounds':
          fitBounds(cmd.coords);
          break;
        case 'setMapType':
          setMapType(cmd.mapType);
          break;
      }
    };
  </script>
</body>
</html>`;
}

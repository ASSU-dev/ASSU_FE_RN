import { SOONGSIL } from "@/shared/config/map";
import { colorTokens } from "@/shared/styles/tokens";
import { buildMarkerScript } from "./buildMarkerScript";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
	return {
		r: Number.parseInt(hex.slice(1, 3), 16),
		g: Number.parseInt(hex.slice(3, 5), 16),
		b: Number.parseInt(hex.slice(5, 7), 16),
	};
}

export function buildMapHtml(
	appKey: string,
	boundsTrackingEnabled: boolean,
): string {
	const { r, g, b } = hexToRgb(colorTokens.primary);
	const primary = colorTokens.primary;
	const canvas = colorTokens.canvas;
	const coneFill = `rgba(${r},${g},${b},0.35)`;
	const ring = `rgba(${r},${g},${b},0.15)`;
	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map;
    var boundsTrackingEnabled = ${boundsTrackingEnabled};
    var myLocationOverlay = null;

    function createMyLocationOverlay(position) {
      var content =
        '<div style="position:relative;width:16px;height:16px;">' +
          '<div id="loc-cone" style="position:absolute;bottom:8px;left:2px;width:12px;height:20px;transform-origin:6px 100%;transform:rotate(0deg);transition:transform 0.2s linear;">' +
            '<svg width="12" height="20" viewBox="0 0 12 20" fill="${coneFill}"><polygon points="6,0 0,20 12,20"/></svg>' +
          '</div>' +
          '<div style="position:absolute;top:0;right:0;bottom:0;left:0;background:${primary};border:2.5px solid ${canvas};border-radius:50%;box-shadow:0 0 0 6px ${ring};"></div>' +
        '</div>';
      myLocationOverlay = new kakao.maps.CustomOverlay({
        position: position,
        content: content,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 10
      });
      myLocationOverlay.setMap(map);
    }

    window.updateMyLocation = function(lat, lng) {
      var position = new kakao.maps.LatLng(lat, lng);
      if (myLocationOverlay) {
        myLocationOverlay.setPosition(position);
      } else {
        createMyLocationOverlay(position);
      }
    };

    window.updateHeading = function(heading) {
      var cone = document.getElementById('loc-cone');
      if (!cone || heading === null || heading === undefined) return;
      cone.style.transform = 'rotate(' + heading + 'deg)';
    };

    window.postRegionChange = function() {
      if (!map || !boundsTrackingEnabled) return;
      var bounds = map.getBounds();
      var southWest = bounds.getSouthWest();
      var northEast = bounds.getNorthEast();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'REGION_CHANGE',
        bounds: {
          lng1: southWest.getLng(),
          lat1: northEast.getLat(),
          lng2: northEast.getLng(),
          lat2: northEast.getLat(),
          lng3: northEast.getLng(),
          lat3: southWest.getLat(),
          lng4: southWest.getLng(),
          lat4: southWest.getLat()
        }
      }));
    };

${buildMarkerScript()}

    function initMap() {
      var initialPos = new kakao.maps.LatLng(${SOONGSIL.lat}, ${SOONGSIL.lng});
      map = new kakao.maps.Map(document.getElementById('map'), {
        center: initialPos,
        level: 3
      });
      kakao.maps.event.addListener(map, 'click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_PRESS' }));
      });
      // 줌 변경 시 픽셀 거리 기반 클러스터를 다시 계산한다
      kakao.maps.event.addListener(map, 'zoom_changed', function() {
        if (clusteringEnabled) renderStoreMarkers();
      });
      if (boundsTrackingEnabled) {
        kakao.maps.event.addListener(map, 'idle', function() {
          window.postRegionChange();
        });
      }
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
    }
  </script>
  <script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false"></script>
  <script>kakao.maps.load(initMap);</script>
</body>
</html>`;
}

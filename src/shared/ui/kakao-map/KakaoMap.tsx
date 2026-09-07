import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { StyleSheet } from "react-native";
import WebView, {
	type WebViewMessageEvent,
	type WebViewProps,
} from "react-native-webview";

import { SOONGSIL } from "@/shared/config/map";
import { colorTokens } from "@/shared/styles/tokens";
import type { LatLng, MapBounds } from "@/shared/types/map";
import { categoryMarkerSvgs } from "./mapMarkerSvgs";
import { partnerMarkerSvg } from "./partnerMarkerSvg";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
	return {
		r: Number.parseInt(hex.slice(1, 3), 16),
		g: Number.parseInt(hex.slice(3, 5), 16),
		b: Number.parseInt(hex.slice(5, 7), 16),
	};
}

type KakaoWebViewSource = NonNullable<WebViewProps["source"]>;

export type { MapBounds } from "@/shared/types/map";

const MAP_BOUNDS_KEYS = [
	"lng1",
	"lat1",
	"lng2",
	"lat2",
	"lng3",
	"lat3",
	"lng4",
	"lat4",
] as const;

function isMapBounds(value: unknown): value is MapBounds {
	if (typeof value !== "object" || value === null) return false;
	const record = value as Record<string, unknown>;
	return MAP_BOUNDS_KEYS.every((key) => {
		const coordinate = record[key];
		return typeof coordinate === "number" && Number.isFinite(coordinate);
	});
}

type KakaoMapProps = {
	initialCenter?: LatLng;
	myLocation?: LatLng | null;
	heading?: number | null;
	markers?: KakaoMapMarker[];
	partnerMarkersEnabled?: boolean;
	/** 카테고리 아이콘 마커 사용 (신규 학생 지도) — partnerMarkersEnabled보다 우선 */
	categoryMarkersEnabled?: boolean;
	/** 카테고리 마커 근접 클러스터링(흰 원 + 개수) 사용 여부 */
	clusteringEnabled?: boolean;
	selectedMarkerId?: string | null;
	onMarkerPress?: (markerId: string) => void;
	onMapPress?: () => void;
	/** 맵 이동/줌 완료 시 현재 표시 영역을 전달 */
	onRegionChange?: (bounds: MapBounds) => void;
};

export type KakaoMapHandle = {
	panTo: (lat: number, lng: number) => void;
};

export type KakaoMapMarker = {
	id: string;
	name: string;
	latitude: number;
	longitude: number;
	hasPartner?: boolean;
	/** StoreCategory 값 — 카테고리 마커 아이콘 선택에 사용 (미지정 시 OTHERS) */
	category?: string;
	/** 마커 하단 라벨에 표시할 혜택 텍스트 */
	benefit?: string;
};

export const KakaoMap = forwardRef<KakaoMapHandle, KakaoMapProps>(
	function KakaoMap(
		{
			initialCenter = SOONGSIL,
			myLocation,
			heading,
			markers = [],
			partnerMarkersEnabled = false,
			categoryMarkersEnabled = false,
			clusteringEnabled = false,
			selectedMarkerId,
			onMarkerPress,
			onMapPress,
			onRegionChange,
		},
		ref,
	) {
		const appKey = process.env.EXPO_PUBLIC_KAKAO_JS_KEY?.trim();
		const webViewRef = useRef<WebView>(null);
		const prevMarkersRef = useRef<string>("");
		const [isMapReady, setIsMapReady] = useState(false);
		const boundsTrackingEnabled = onRegionChange !== undefined;
		const pendingPanRef = useRef<LatLng | null>(null);
		// Set to true after the first deliberate panTo — prevents GPS re-centering from overriding it.
		const deliberatelyPannedRef = useRef(false);
		const webViewSource = useMemo<KakaoWebViewSource | null>(() => {
			if (!appKey) return null;

			return {
				html: buildMapHtml(appKey, boundsTrackingEnabled),
				baseUrl: "http://localhost",
			};
		}, [appKey, boundsTrackingEnabled]);

		useEffect(() => {
			if (appKey || !__DEV__) return;

			console.error(
				"KakaoMap requires EXPO_PUBLIC_KAKAO_JS_KEY to render the map.",
			);
		}, [appKey]);

		useImperativeHandle(ref, () => ({
			panTo: (lat, lng) => {
				deliberatelyPannedRef.current = true;
				if (isMapReady) {
					webViewRef.current?.injectJavaScript(
						`map.panTo(new kakao.maps.LatLng(${lat}, ${lng})); true;`,
					);
				} else {
					pendingPanRef.current = { lat, lng };
				}
			},
		}));

		// Re-center on GPS update — skipped after a deliberate panTo to preserve it.
		// Also applies any panTo that was queued before the map was ready.
		useEffect(() => {
			if (!isMapReady) return;
			if (!deliberatelyPannedRef.current) {
				webViewRef.current?.injectJavaScript(`
				map.setCenter(new kakao.maps.LatLng(${initialCenter.lat}, ${initialCenter.lng}));
				map.setLevel(3);
				true;
			`);
			}
			const pending = pendingPanRef.current;
			if (pending) {
				pendingPanRef.current = null;
				const { lat, lng } = pending;
				setTimeout(() => {
					webViewRef.current?.injectJavaScript(
						`map.panTo(new kakao.maps.LatLng(${lat}, ${lng})); true;`,
					);
				}, 0);
			}
		}, [initialCenter.lat, initialCenter.lng, isMapReady]);

		// Create or move the current-location overlay.
		useEffect(() => {
			if (!isMapReady || !myLocation) return;
			webViewRef.current?.injectJavaScript(
				`window.updateMyLocation(${myLocation.lat}, ${myLocation.lng}); true;`,
			);
		}, [myLocation, isMapReady]);

		// Update only the heading cone transform.
		useEffect(() => {
			if (!isMapReady) return;
			webViewRef.current?.injectJavaScript(
				`window.updateHeading(${heading ?? "null"}); true;`,
			);
		}, [heading, isMapReady]);

		useEffect(() => {
			if (!isMapReady) return;
			const markerPayload = markers.map((marker) => ({
				...marker,
				isPartnerMarker:
					!categoryMarkersEnabled &&
					partnerMarkersEnabled &&
					marker.hasPartner === true,
				categoryMarker: categoryMarkersEnabled && marker.hasPartner === true,
				selected: marker.id === selectedMarkerId,
			}));
			const serializedMarkers = JSON.stringify(markerPayload).replace(
				/</g,
				"\\u003c",
			);
			const injectionKey = `${serializedMarkers}|${clusteringEnabled}`;
			if (prevMarkersRef.current === injectionKey) return;
			prevMarkersRef.current = injectionKey;

			webViewRef.current?.injectJavaScript(
				`window.updateStoreMarkers(${serializedMarkers}, { clustering: ${clusteringEnabled === true} }); true;`,
			);
		}, [
			isMapReady,
			markers,
			partnerMarkersEnabled,
			categoryMarkersEnabled,
			clusteringEnabled,
			selectedMarkerId,
		]);

		const handleMessage = (event: WebViewMessageEvent) => {
			try {
				const data = JSON.parse(event.nativeEvent.data) as {
					type: string;
					markerId?: string;
					bounds?: unknown;
				};
				if (data.type === "MAP_READY") setIsMapReady(true);
				if (data.type === "MARKER_PRESS" && data.markerId) {
					onMarkerPress?.(data.markerId);
				}
				if (data.type === "REGION_CHANGE" && isMapBounds(data.bounds)) {
					onRegionChange?.(data.bounds);
				}
				if (data.type === "MAP_PRESS") onMapPress?.();
			} catch (error) {
				if (__DEV__) {
					console.warn(
						"KakaoMap received an invalid WebView message.",
						event.nativeEvent.data,
						error,
					);
				}
			}
		};

		if (!webViewSource) return null;

		return (
			<WebView
				ref={webViewRef}
				source={webViewSource}
				style={StyleSheet.absoluteFillObject}
				originWhitelist={["*"]}
				javaScriptEnabled
				scrollEnabled={false}
				onMessage={handleMessage}
			/>
		);
	},
);

function buildMapHtml(appKey: string, boundsTrackingEnabled: boolean): string {
	const { r, g, b } = hexToRgb(colorTokens.primary);
	const primary = colorTokens.primary;
	const canvas = colorTokens.canvas;
	const coneFill = `rgba(${r},${g},${b},0.35)`;
	const ring = `rgba(${r},${g},${b},0.15)`;
	const markerSvg = JSON.stringify(partnerMarkerSvg);
	const categorySvgsJson = JSON.stringify(categoryMarkerSvgs).replace(
		/</g,
		"\\u003c",
	);
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
    var storeMarkers = Object.create(null);

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

    var CATEGORY_MARKER_SVGS = ${categorySvgsJson};
    var CLUSTER_RADIUS_PX = 48;
    var storeData = [];
    var clusteringEnabled = false;

    function postMarkerPress(markerId) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MARKER_PRESS', markerId: String(markerId) }));
    }

    window.updateStoreMarkers = function(markers, options) {
      storeData = Array.isArray(markers) ? markers : [];
      clusteringEnabled = !!(options && options.clustering);
      renderStoreMarkers();
    };

    // 같은 ID와 표시 내용이면 기존 마커를 지도에 붙인 채 재사용한다.
    function retainStoreMarker(nextMarkers, key, signature, createMarker) {
      var previous = storeMarkers[key];
      nextMarkers[key] = previous && previous.signature === signature
        ? previous
        : { signature: signature, marker: createMarker() };
    }

    function renderStoreMarkers() {
      var nextMarkers = Object.create(null);
      var singles = [];
      var clusterable = [];
      storeData.forEach(function(markerData) {
        if (typeof markerData.latitude !== 'number' || typeof markerData.longitude !== 'number') return;
        if (clusteringEnabled && markerData.categoryMarker && markerData.selected !== true) {
          clusterable.push(markerData);
        } else {
          singles.push(markerData);
        }
      });

      // 응답 순서가 바뀌어도 같은 매장들은 같은 순서로 클러스터링한다.
      clusterable.sort(function(left, right) {
        var leftId = String(left.id);
        var rightId = String(right.id);
        return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
      });
      buildClusters(clusterable).forEach(function(cluster) {
        if (cluster.items.length > 1) {
          var key = 'cluster:' + JSON.stringify(cluster.items.map(function(item) { return String(item.id); }));
          var signature = JSON.stringify(cluster.items.map(function(item) { return [item.latitude, item.longitude]; }));
          retainStoreMarker(nextMarkers, key, signature, function() {
            return renderClusterMarker(cluster);
          });
        } else {
          singles.push(cluster.items[0]);
        }
      });
      singles.forEach(function(markerData) {
        var key = 'store:' + String(markerData.id);
        var signature = JSON.stringify([
          markerData.latitude, markerData.longitude, markerData.name,
          markerData.category, markerData.benefit, markerData.selected === true,
          markerData.categoryMarker === true, markerData.isPartnerMarker === true
        ]);
        retainStoreMarker(nextMarkers, key, signature, function() {
          return renderSingleMarker(markerData);
        });
      });

      // 새 마커를 붙인 뒤, 사라졌거나 교체된 항목만 제거한다.
      Object.keys(storeMarkers).forEach(function(key) {
        if (storeMarkers[key] !== nextMarkers[key]) {
          storeMarkers[key].marker.setMap(null);
        }
      });
      storeMarkers = nextMarkers;
    }

    function buildClusters(items) {
      if (items.length === 0) return [];
      var projection = map.getProjection();
      var clusters = [];
      items.forEach(function(item) {
        var point = projection.containerPointFromCoords(new kakao.maps.LatLng(item.latitude, item.longitude));
        var matched = null;
        for (var i = 0; i < clusters.length; i++) {
          var dx = clusters[i].x - point.x;
          var dy = clusters[i].y - point.y;
          if (Math.sqrt(dx * dx + dy * dy) <= CLUSTER_RADIUS_PX) { matched = clusters[i]; break; }
        }
        if (matched) {
          matched.items.push(item);
        } else {
          clusters.push({ x: point.x, y: point.y, items: [item] });
        }
      });
      return clusters;
    }

    function renderSingleMarker(markerData) {
      if (markerData.categoryMarker) return renderCategoryMarker(markerData);
      if (markerData.isPartnerMarker) return renderPartnerMarker(markerData);
      return renderDefaultMarker(markerData);
    }

    function renderCategoryMarker(markerData) {
      var position = new kakao.maps.LatLng(markerData.latitude, markerData.longitude);
      var svgs = CATEGORY_MARKER_SVGS[markerData.category] || CATEGORY_MARKER_SVGS.OTHERS;
      var selected = markerData.selected === true;

      var container = document.createElement('button');
      container.type = 'button';
      container.style.cssText = 'border:0;background:transparent;padding:0;position:relative;width:70px;height:70px;cursor:pointer;overflow:visible;';
      container.setAttribute('aria-label', markerData.name || '제휴 가게');

      // 선택 마커 SVG는 원 중심이 y=42라 -7px 보정해 컨테이너 중심(35,35)에 맞춘다
      var icon = document.createElement('div');
      icon.style.cssText = 'position:absolute;left:0;top:' + (selected ? -7 : 0) + 'px;width:70px;pointer-events:none;';
      icon.innerHTML = selected ? svgs.selected : svgs.default;
      container.appendChild(icon);

      if (markerData.name) {
        var label = document.createElement('div');
        label.style.cssText = 'position:absolute;top:' + (selected ? 60 : 53) + 'px;left:50%;transform:translateX(-50%);text-align:center;white-space:nowrap;pointer-events:none;';
        var nameText = document.createElement('div');
        nameText.textContent = markerData.name;
        nameText.style.cssText = 'color:#040404;font-size:12px;font-weight:600;line-height:15px;text-shadow:0 0 3px ${canvas},0 0 3px ${canvas},0 0 3px ${canvas};';
        label.appendChild(nameText);
        if (markerData.benefit) {
          var benefitText = document.createElement('div');
          benefitText.textContent = markerData.benefit;
          benefitText.style.cssText = 'color:${primary};font-size:11px;font-weight:600;line-height:14px;text-shadow:0 0 3px ${canvas},0 0 3px ${canvas},0 0 3px ${canvas};';
          label.appendChild(benefitText);
        }
        container.appendChild(label);
      }

      container.addEventListener('click', function(event) {
        event.stopPropagation();
        postMarkerPress(markerData.id);
      });

      var overlay = new kakao.maps.CustomOverlay({
        position: position,
        content: container,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: selected ? 20 : 6
      });
      overlay.setMap(map);
      return overlay;
    }

    function renderClusterMarker(cluster) {
      var latSum = 0;
      var lngSum = 0;
      cluster.items.forEach(function(item) { latSum += item.latitude; lngSum += item.longitude; });
      var position = new kakao.maps.LatLng(latSum / cluster.items.length, lngSum / cluster.items.length);

      var container = document.createElement('button');
      container.type = 'button';
      container.textContent = String(cluster.items.length);
      container.style.cssText = 'border:0;width:34px;height:34px;border-radius:50%;background:${canvas};box-shadow:0 0 10px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;color:#040404;cursor:pointer;';
      container.setAttribute('aria-label', cluster.items.length + '개 매장');

      container.addEventListener('click', function(event) {
        event.stopPropagation();
        map.setLevel(map.getLevel() - 1, { anchor: position });
      });

      var overlay = new kakao.maps.CustomOverlay({
        position: position,
        content: container,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 4
      });
      overlay.setMap(map);
      return overlay;
    }

    function renderPartnerMarker(markerData) {
      var position = new kakao.maps.LatLng(markerData.latitude, markerData.longitude);
      var selected = markerData.selected === true;
      var container = document.createElement('button');
      container.type = 'button';
      container.style.cssText = 'border:0;background:transparent;padding:0;display:flex;flex-direction:column;align-items:center;cursor:pointer;overflow:visible;';
      container.setAttribute('aria-label', markerData.name || '제휴 가게');

      var iconSize = selected ? 40 : 25;
      var shellSize = selected ? 60 : 25;
      var iconShell = document.createElement('div');
      iconShell.style.cssText = 'width:' + shellSize + 'px;height:' + shellSize + 'px;display:flex;align-items:center;justify-content:center;';
      var icon = document.createElement('div');
      icon.style.cssText = 'width:' + iconSize + 'px;height:' + iconSize + 'px;filter:drop-shadow(0 2px 4px rgba(0,104,254,0.35));transition:width 0.15s ease,height 0.15s ease;';
      icon.innerHTML = ${markerSvg};
      var svg = icon.querySelector('svg');
      if (svg) {
        svg.setAttribute('width', String(iconSize));
        svg.setAttribute('height', String(iconSize));
      }
      iconShell.appendChild(icon);
      container.appendChild(iconShell);

      if (selected && markerData.name) {
        var label = document.createElement('span');
        label.textContent = markerData.name;
        label.style.cssText = 'margin-top:2px;color:${primary};font-size:12px;font-weight:600;line-height:16px;white-space:nowrap;text-shadow:0 1px 2px ${canvas};';
        container.appendChild(label);
      }

      container.addEventListener('click', function(event) {
        event.stopPropagation();
        postMarkerPress(markerData.id);
      });

      var overlay = new kakao.maps.CustomOverlay({
        position: position,
        content: container,
        xAnchor: 0.5,
        yAnchor: selected ? 0.35 : 0.5,
        zIndex: selected ? 20 : 5
      });
      overlay.setMap(map);
      return overlay;
    }

    function renderDefaultMarker(markerData) {
      var position = new kakao.maps.LatLng(markerData.latitude, markerData.longitude);
      var marker = new kakao.maps.Marker({ position: position, title: markerData.name || '' });
      kakao.maps.event.addListener(marker, 'click', function() {
        postMarkerPress(markerData.id);
      });
      marker.setMap(map);
      return marker;
    }

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

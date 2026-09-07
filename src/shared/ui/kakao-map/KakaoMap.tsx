import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { StyleSheet } from "react-native";
import WebView, { type WebViewProps } from "react-native-webview";

import { SOONGSIL } from "@/shared/config/map";
import type { LatLng } from "@/shared/types/map";
import { buildMapHtml } from "./lib/buildMapHtml";
import {
	buildHeadingScript,
	buildLocationScript,
	buildMarkersUpdate,
	buildPanToScript,
	buildRecenterScript,
	handleMapMessage,
} from "./lib/mapBridge";
import type { KakaoMapHandle, KakaoMapProps } from "./types";

export type { MapBounds } from "@/shared/types/map";
export type { KakaoMapHandle, KakaoMapMarker } from "./types";

type KakaoWebViewSource = NonNullable<WebViewProps["source"]>;

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
					webViewRef.current?.injectJavaScript(buildPanToScript(lat, lng));
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
				webViewRef.current?.injectJavaScript(
					buildRecenterScript({
						lat: initialCenter.lat,
						lng: initialCenter.lng,
					}),
				);
			}
			const pending = pendingPanRef.current;
			if (pending) {
				pendingPanRef.current = null;
				const { lat, lng } = pending;
				setTimeout(() => {
					webViewRef.current?.injectJavaScript(buildPanToScript(lat, lng));
				}, 0);
			}
		}, [initialCenter.lat, initialCenter.lng, isMapReady]);

		// Create or move the current-location overlay.
		useEffect(() => {
			if (!isMapReady || !myLocation) return;
			webViewRef.current?.injectJavaScript(buildLocationScript(myLocation));
		}, [myLocation, isMapReady]);

		// Update only the heading cone transform.
		useEffect(() => {
			if (!isMapReady) return;
			webViewRef.current?.injectJavaScript(buildHeadingScript(heading));
		}, [heading, isMapReady]);

		useEffect(() => {
			if (!isMapReady) return;
			const { key, script } = buildMarkersUpdate(markers, {
				partnerMarkersEnabled,
				categoryMarkersEnabled,
				selectedMarkerId,
				clusteringEnabled,
			});
			if (prevMarkersRef.current === key) return;
			prevMarkersRef.current = key;
			webViewRef.current?.injectJavaScript(script);
		}, [
			isMapReady,
			markers,
			partnerMarkersEnabled,
			categoryMarkersEnabled,
			clusteringEnabled,
			selectedMarkerId,
		]);

		if (!webViewSource) return null;

		return (
			<WebView
				ref={webViewRef}
				source={webViewSource}
				style={StyleSheet.absoluteFillObject}
				originWhitelist={["*"]}
				javaScriptEnabled
				scrollEnabled={false}
				onMessage={(event) =>
					handleMapMessage(event, {
						onReady: () => setIsMapReady(true),
						onMarkerPress,
						onRegionChange,
						onMapPress,
					})
				}
			/>
		);
	},
);

import type { WebViewMessageEvent } from "react-native-webview";

import type { LatLng, MapBounds } from "@/shared/types/map";
import type { KakaoMapMarker, KakaoMapProps } from "../types";

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

export function buildPanToScript(lat: number, lng: number): string {
	return `map.jump(new kakao.maps.LatLng(${lat}, ${lng}), map.getLevel(), { animate: { duration: 650 } }); true;`;
}

export function buildRecenterScript(center: LatLng): string {
	return `
				map.setCenter(new kakao.maps.LatLng(${center.lat}, ${center.lng}));
				map.setLevel(3);
				true;
			`;
}

export function buildLocationScript(location: LatLng): string {
	return `window.updateMyLocation(${location.lat}, ${location.lng}); true;`;
}

export function buildHeadingScript(heading: number | null | undefined): string {
	return `window.updateHeading(${heading ?? "null"}); true;`;
}

type MarkerOptions = Pick<
	KakaoMapProps,
	| "partnerMarkersEnabled"
	| "categoryMarkersEnabled"
	| "selectedMarkerId"
	| "clusteringEnabled"
>;

export function buildMarkersUpdate(
	markers: KakaoMapMarker[],
	{
		partnerMarkersEnabled,
		categoryMarkersEnabled,
		selectedMarkerId,
		clusteringEnabled,
	}: MarkerOptions,
): { key: string; script: string } {
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
	return {
		key: injectionKey,
		script: `window.updateStoreMarkers(${serializedMarkers}, { clustering: ${clusteringEnabled === true} }); true;`,
	};
}

type MapMessageCallbacks = Pick<
	KakaoMapProps,
	"onMarkerPress" | "onRegionChange" | "onMapPress"
> & { onReady: () => void };

export function handleMapMessage(
	event: WebViewMessageEvent,
	{ onReady, onMarkerPress, onRegionChange, onMapPress }: MapMessageCallbacks,
): void {
	try {
		const data = JSON.parse(event.nativeEvent.data) as {
			type: string;
			markerId?: string;
			bounds?: unknown;
		};
		if (data.type === "MAP_READY") onReady();
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
}

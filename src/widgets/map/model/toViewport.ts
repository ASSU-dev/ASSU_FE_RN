import type { LatLng, MapBounds } from "@/shared/types/map";

/** 지도 중심 좌표를 /map/nearby 조회용 사각 viewport로 변환 */
export function toViewport(center: LatLng, delta = 0.01): MapBounds {
	return {
		lng1: center.lng - delta,
		lat1: center.lat + delta,
		lng2: center.lng + delta,
		lat2: center.lat + delta,
		lng3: center.lng + delta,
		lat3: center.lat - delta,
		lng4: center.lng - delta,
		lat4: center.lat - delta,
	};
}

import type { LatLng, MapBounds } from "@/shared/types/map";

/** 위치를 얻기 전 또는 위치 권한이 없을 때 사용하는 숭실대 중심 좌표 */
export const SOONGSIL: LatLng = { lat: 37.4963, lng: 126.9572 };

/** 인기 매장 조회에 사용하는 숭실대 주변 기본 범위 */
export const SOONGSIL_VIEWPORT: MapBounds = {
	lng1: 126.9472,
	lat1: 37.5063,
	lng2: 126.9672,
	lat2: 37.5063,
	lng3: 126.9672,
	lat3: 37.4863,
	lng4: 126.9472,
	lat4: 37.4863,
};

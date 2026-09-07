export interface LatLng {
	lat: number;
	lng: number;
}

/** 지도 조회 영역의 모서리 좌표: 북서 → 북동 → 남동 → 남서 */
export interface MapBounds {
	lng1: number;
	lat1: number;
	lng2: number;
	lat2: number;
	lng3: number;
	lat3: number;
	lng4: number;
	lat4: number;
}

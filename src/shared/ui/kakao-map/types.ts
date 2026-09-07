import type { LatLng, MapBounds } from "@/shared/types/map";

export type KakaoMapProps = {
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

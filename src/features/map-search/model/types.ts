import type { StoreCategory } from "@/entities/store";

export interface MapViewport {
	lng1: number;
	lat1: number;
	lng2: number;
	lat2: number;
	lng3: number;
	lat3: number;
	lng4: number;
	lat4: number;
}

/** 주변 장소 조회 필터 (STUDENT 전용 파라미터) */
export interface NearbyStoresFilter {
	storeCategory?: StoreCategory;
	adminId?: string;
}

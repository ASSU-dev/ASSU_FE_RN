import type { StoreCategory } from "@/entities/store";

export type { MapBounds as MapViewport } from "@/shared/types/map";

/** 주변 장소 조회 필터 (STUDENT 전용 파라미터) */
export interface NearbyStoresFilter {
	storeCategory?: StoreCategory;
	adminId?: string;
}

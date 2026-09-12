import type {
	PopularStore,
	SearchResultStore,
	StoreMarker,
} from "@/entities/store";
import type { BaseResponse } from "@/shared/api";
import { apiInstance, getGetStoreDetailsApi } from "@/shared/api";
import { SOONGSIL_VIEWPORT } from "@/shared/config/map";
import {
	getString,
	isRecord,
	pickList,
	toSearchResultStore,
	toStoreCategory,
	toStoreMarker,
} from "../lib/mapSearchMappers";
import type { MapViewport, NearbyStoresFilter } from "../model/types";

async function fetchNearbyRaw(
	viewport: MapViewport,
	filter?: NearbyStoresFilter,
): Promise<unknown[]> {
	const res = await apiInstance.get<BaseResponse<unknown>>("/map/nearby", {
		params: {
			...viewport,
			storeCategory: filter?.storeCategory,
			adminId: filter?.adminId,
		},
	});
	const responseResult = res.data?.result;
	const list = pickList(responseResult);
	if (__DEV__) {
		const stores = list.map((item, index) => {
			if (!isRecord(item)) {
				return {
					index,
					isStoreObject: false,
					valueType: Array.isArray(item) ? "array" : typeof item,
				};
			}

			const hasCategory = Object.hasOwn(item, "category");
			const hasStoreCategory = Object.hasOwn(item, "storeCategory");

			return {
				index,
				isStoreObject: true,
				storeId: getString(item, ["storeId", "id"]) ?? null,
				name: getString(item, ["name", "storeName"]) ?? null,
				hasCategory,
				category: hasCategory ? item.category : "[FIELD_MISSING]",
				hasStoreCategory,
				storeCategory: hasStoreCategory
					? item.storeCategory
					: "[FIELD_MISSING]",
				resolvedCategory:
					toStoreCategory(getString(item, ["category", "storeCategory"])) ??
					null,
				responseKeys: Object.keys(item),
			};
		});

		console.log("[fetchNearbyRaw] 주변 매장 응답 진단:", {
			filter: filter ?? null,
			responseResultType: Array.isArray(responseResult)
				? "array"
				: typeof responseResult,
			storeCount: list.length,
			stores,
		});
	}
	return list;
}

export const fetchPopularStores = async (): Promise<PopularStore[]> => {
	const nearby = await fetchNearbyRaw(SOONGSIL_VIEWPORT);
	const popularStores = nearby
		.map(toSearchResultStore)
		.filter((store): store is SearchResultStore => store !== null)
		.slice(0, 8)
		.map((store) => ({
			id: store.id,
			name: store.name,
			category: store.tag,
		}));
	if (__DEV__)
		console.log("[fetchPopularStores] 응답:", {
			count: popularStores.length,
			items: popularStores,
		});
	return popularStores;
};

export const fetchSearchStores = async (
	query: string,
): Promise<SearchResultStore[]> => {
	if (__DEV__)
		console.log("[fetchSearchStores] 요청:", {
			endpoint: "/map/search",
			searchKeyword: query,
		});
	const res = await apiInstance.get<BaseResponse<unknown>>("/map/search", {
		params: { searchKeyword: query },
	});
	const stores = pickList(res.data?.result)
		.map(toSearchResultStore)
		.filter((store): store is SearchResultStore => store !== null);
	if (__DEV__)
		console.log("[fetchSearchStores] 응답:", {
			count: stores.length,
			items: stores,
		});
	return stores;
};

export async function fetchNearbyStores(
	viewport: MapViewport,
	filter?: NearbyStoresFilter,
): Promise<StoreMarker[]> {
	const nearby = await fetchNearbyRaw(viewport, filter);
	const markers = nearby
		.map(toStoreMarker)
		.filter((marker): marker is StoreMarker => marker !== null);
	return markers;
}

/** 검색 응답에 좌표가 없으면 기존 매장 조회 API로 보완한다. */
export async function fetchSearchStoreLocation(store: SearchResultStore) {
	let { latitude, longitude } = store;
	if (!isValidStoreLocation(latitude, longitude)) {
		const storeId = Number(store.storeId);
		if (!Number.isSafeInteger(storeId) || storeId <= 0) {
			throw new Error("매장 정보를 확인할 수 없습니다.");
		}
		const response = await getGetStoreDetailsApi().getStoreDetails(storeId);
		if (response.isSuccess === false) {
			throw new Error("매장 정보를 확인할 수 없습니다.");
		}
		latitude = response.result?.latitude;
		longitude = response.result?.longitude;
	}
	if (
		latitude === undefined ||
		longitude === undefined ||
		!isValidStoreLocation(latitude, longitude)
	) {
		throw new Error("매장 위치를 확인할 수 없습니다.");
	}
	return { ...store, latitude, longitude };
}

function isValidStoreLocation(latitude?: number, longitude?: number): boolean {
	return (
		latitude !== undefined &&
		longitude !== undefined &&
		Number.isFinite(latitude) &&
		Number.isFinite(longitude) &&
		Math.abs(latitude) <= 90 &&
		Math.abs(longitude) <= 180
	);
}

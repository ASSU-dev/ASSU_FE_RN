import { useQuery } from "@tanstack/react-query";

import type {
	PopularStore,
	SearchResultStore,
	StoreCategory,
	StoreMarker,
	StorePartnership,
} from "@/entities/store";
import { STORE_CATEGORY_CONFIG_MAP } from "@/entities/store";
import type { BaseResponse } from "@/shared/api";
import { apiInstance } from "@/shared/api";

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

type UnknownRecord = Record<string, unknown>;

const SOONGSIL_VIEWPORT: MapViewport = {
	lng1: 126.9472,
	lat1: 37.5063,
	lng2: 126.9672,
	lat2: 37.5063,
	lng3: 126.9672,
	lat3: 37.4863,
	lng4: 126.9472,
	lat4: 37.4863,
};

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(record: UnknownRecord, keys: string[]): string | undefined {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "string" && value.length > 0) return value;
		if (typeof value === "number") return String(value);
	}
	return undefined;
}

function getNumber(record: UnknownRecord, keys: string[]): number | undefined {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "number") return value;
		if (typeof value === "string") {
			const parsed = Number(value);
			if (!Number.isNaN(parsed)) return parsed;
		}
	}
	return undefined;
}

function getBoolean(
	record: UnknownRecord,
	keys: string[],
): boolean | undefined {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "boolean") return value;
	}
	return undefined;
}

function pickList(value: unknown): unknown[] {
	if (Array.isArray(value)) return value;
	if (!isRecord(value)) return [];

	for (const key of [
		"items",
		"content",
		"stores",
		"places",
		"data",
		"result",
	]) {
		const nested = value[key];
		if (Array.isArray(nested)) return nested;
		if (isRecord(nested)) {
			const nestedItems = pickList(nested);
			if (nestedItems.length > 0) return nestedItems;
		}
	}

	const id = getString(value, [
		"storeId",
		"partnerId",
		"adminId",
		"id",
		"placeId",
		"kakaoId",
	]);
	const name = getString(value, ["name", "storeName", "placeName"]);
	if (id && name) return [value];

	const values = Object.values(value);
	if (
		values.length > 0 &&
		values.every((item) => Array.isArray(item) || isRecord(item))
	) {
		return values.flatMap((item) => (Array.isArray(item) ? item : [item]));
	}

	return [];
}

function toSearchResultStore(value: unknown): SearchResultStore | null {
	if (!isRecord(value)) return null;

	const storeId = getString(value, ["storeId"]);
	const partnerId = getString(value, ["partnerId"]);
	const adminId = getString(value, ["adminId"]);
	const id =
		storeId ??
		partnerId ??
		adminId ??
		getString(value, ["id", "placeId", "kakaoId"]);
	const name = getString(value, ["name", "storeName", "placeName"]);
	if (!id || !name) return null;
	const partnershipId = getString(value, ["partnershipId"]);

	return {
		id,
		name,
		storeId,
		partnerId,
		adminId,
		imageUri: getString(value, ["imageUri", "imageUrl", "storeImageUrl"]),
		tag:
			getString(value, ["tag", "adminName", "affiliation", "category"]) ??
			getPartnershipAdminName(value.partnerships),
		benefit: getStoreBenefit(value),
		address: getString(value, ["address", "roadAddress", "storeAddress"]),
		rate: getNumber(value, ["rate", "rating", "score"]),
		latitude: getNumber(value, ["latitude", "lat", "y"]),
		longitude: getNumber(value, ["longitude", "lng", "lon", "x"]),
		profileUrl: getString(value, ["profileUrl", "placeUrl"]),
		phoneNumber: getString(value, ["phoneNumber", "phone"]),
		isPartner:
			getBoolean(value, [
				"hasPartner",
				"isPartnered",
				"isPartner",
				"partner",
			]) ?? partnershipId !== undefined,
		partnershipId,
		partnershipStartDate: getString(value, [
			"partnershipStartDate",
			"startDate",
		]),
		partnershipEndDate: getString(value, ["partnershipEndDate", "endDate"]),
	};
}

function getBenefitText(value: unknown): string | undefined {
	if (typeof value === "string" && value.trim().length > 0) return value.trim();
	if (Array.isArray(value)) {
		for (const item of value) {
			const text = getBenefitText(item);
			if (text) return text;
		}
		return undefined;
	}
	if (!isRecord(value)) return undefined;

	const direct = getString(value, [
		"benefitDescription",
		"description",
		"content",
		"note",
		"goodsName",
	]);
	if (direct) return direct;

	const discountRate = getNumber(value, ["discountRate"]);
	if (discountRate !== undefined) return `${discountRate}% 할인`;

	return getBenefitText(value.benefits) ?? getBenefitText(value.goods);
}

function getStoreBenefit(value: UnknownRecord): string | undefined {
	return (
		getString(value, [
			"benefit",
			"benefitDescription",
			"partnershipBenefit",
			"description",
		]) ?? getBenefitText(value.partnerships)
	);
}

function toStoreCategory(value: unknown): StoreCategory | undefined {
	if (typeof value !== "string") return undefined;
	return value in STORE_CATEGORY_CONFIG_MAP
		? (value as StoreCategory)
		: undefined;
}

function toStorePartnerships(value: unknown): StorePartnership[] | undefined {
	if (!Array.isArray(value)) return undefined;

	const partnerships: StorePartnership[] = [];
	for (const item of value) {
		if (!isRecord(item)) continue;
		const adminName = getString(item, ["adminName"]);
		if (!adminName) continue;

		const benefits = Array.isArray(item.benefits)
			? item.benefits
					.map((benefit) =>
						typeof benefit === "string" ? benefit : getBenefitText(benefit),
					)
					.filter((benefit): benefit is string => Boolean(benefit))
			: [];
		partnerships.push({
			adminId: getString(item, ["adminId"]),
			adminName,
			benefits,
		});
	}

	return partnerships.length > 0 ? partnerships : undefined;
}

function getPartnershipAdminName(value: unknown): string | undefined {
	if (!Array.isArray(value)) return undefined;

	for (const partnership of value) {
		if (!isRecord(partnership)) continue;
		const adminName = getString(partnership, ["adminName"]);
		if (adminName) return adminName;
	}

	return undefined;
}

function toStoreMarker(value: unknown): StoreMarker | null {
	if (!isRecord(value)) return null;

	const storeId = getString(value, ["storeId"]);
	const partnerId = getString(value, ["partnerId"]);
	const adminId = getString(value, ["adminId"]);
	const id =
		storeId ??
		partnerId ??
		adminId ??
		getString(value, ["id", "placeId", "kakaoId"]);
	const name = getString(value, ["name", "storeName", "placeName"]);
	const latitude = getNumber(value, ["latitude", "lat", "y"]);
	const longitude = getNumber(value, ["longitude", "lng", "lon", "x"]);
	if (!id || !name || latitude === undefined || longitude === undefined) {
		return null;
	}

	return {
		id,
		name,
		storeId,
		partnerId,
		adminId,
		address: getString(value, ["address", "roadAddress", "storeAddress"]) ?? "",
		latitude,
		longitude,
		count: getNumber(value, ["count", "usageCount"]),
		hasPartner:
			getBoolean(value, [
				"hasPartner",
				"isPartner",
				"partner",
				"isPartnered",
			]) ?? false,
		rate: getNumber(value, ["rate", "rating", "score"]) ?? 0,
		benefit: getStoreBenefit(value),
		category: toStoreCategory(getString(value, ["category", "storeCategory"])),
		partnerships: toStorePartnerships(value.partnerships),
		imageUri: getString(value, [
			"imageUri",
			"imageUrl",
			"storeImageUrl",
			"profileImageUrl",
			"thumbnailUrl",
		]),
		profileUrl: getString(value, ["profileUrl", "placeUrl"]),
		phoneNumber: getString(value, ["phoneNumber", "phone"]),
		partnershipId: getString(value, ["partnershipId"]),
		partnershipStartDate: getString(value, ["partnershipStartDate"]),
		partnershipEndDate: getString(value, ["partnershipEndDate"]),
	};
}

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

const fetchPopularStores = async (): Promise<PopularStore[]> => {
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

const fetchSearchStores = async (
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

async function fetchNearbyStores(
	viewport: MapViewport,
	filter?: NearbyStoresFilter,
): Promise<StoreMarker[]> {
	const nearby = await fetchNearbyRaw(viewport, filter);
	const markers = nearby
		.map(toStoreMarker)
		.filter((marker): marker is StoreMarker => marker !== null);
	return markers;
}

export function usePopularStores() {
	return useQuery<PopularStore[]>({
		queryKey: ["map", "nearby", "popular"],
		queryFn: fetchPopularStores,
		staleTime: 1000 * 60 * 5,
	});
}

export function useSearchStores(query: string) {
	return useQuery<SearchResultStore[]>({
		queryKey: ["map", "search", query],
		queryFn: () => fetchSearchStores(query),
		enabled: query.trim().length > 0,
		staleTime: 1000 * 60,
	});
}

export function useNearbyStores(
	viewport: MapViewport | null,
	filter?: NearbyStoresFilter,
) {
	return useQuery<StoreMarker[]>({
		queryKey: [
			"map",
			"nearby",
			viewport,
			filter?.storeCategory ?? null,
			filter?.adminId ?? null,
		],
		queryFn: () => fetchNearbyStores(viewport as MapViewport, filter),
		enabled: viewport !== null,
		placeholderData: (previousData, previousQuery) => {
			// 같은 필터에서 지도 범위만 바뀌면 조회 중에도 기존 마커를 유지한다.
			if (
				viewport === null ||
				previousQuery?.queryKey[3] !== (filter?.storeCategory ?? null) ||
				previousQuery?.queryKey[4] !== (filter?.adminId ?? null)
			) {
				return undefined;
			}
			return previousData;
		},
		staleTime: 1000 * 60,
	});
}

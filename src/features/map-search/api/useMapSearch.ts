import { useMutation, useQuery } from "@tanstack/react-query";

import type {
	PopularStore,
	SearchResultStore,
	StoreMarker,
} from "@/entities/store";
import type { MapViewport, NearbyStoresFilter } from "../model/types";
import {
	fetchNearbyStores,
	fetchPopularStores,
	fetchSearchStoreLocation,
	fetchSearchStores,
} from "./mapSearchApi";

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

export function useSearchStoreLocation() {
	return useMutation({ mutationFn: fetchSearchStoreLocation });
}

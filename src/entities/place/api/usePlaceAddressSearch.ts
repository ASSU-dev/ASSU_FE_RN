import { useQuery } from "@tanstack/react-query";

import type { BaseResponse } from "@/shared/api";
import { apiInstance } from "@/shared/api";
import type { AddressSearchItem } from "@/shared/ui/address-search/types";

interface PlaceSuggestionDto {
	placeId: string;
	name: string;
	category?: string;
	address?: string;
	roadAddress?: string;
	phone?: string;
	placeUrl?: string;
	latitude?: number;
	longitude?: number;
	distance?: number;
}

function toAddressSearchItem(
	dto: PlaceSuggestionDto,
): AddressSearchItem | null {
	const label = dto.roadAddress || dto.address || dto.name;
	if (!dto.placeId || !label) return null;

	return {
		id: dto.placeId,
		label,
		latitude: dto.latitude,
		longitude: dto.longitude,
	};
}

async function fetchPlaceAddresses(
	query: string,
): Promise<AddressSearchItem[]> {
	if (__DEV__)
		console.log("[fetchPlaceAddresses] 요청:", "/map/place", {
			searchKeyword: query,
			limit: 10,
		});
	const res = await apiInstance.get<BaseResponse<PlaceSuggestionDto[] | null>>(
		"/map/place",
		{ params: { searchKeyword: query, limit: 10 } },
	);
	const places = res.data?.result;
	const items = (Array.isArray(places) ? places : [])
		.map(toAddressSearchItem)
		.filter((item): item is AddressSearchItem => item !== null);
	if (__DEV__)
		console.log("[fetchPlaceAddresses] 응답:", {
			count: items.length,
			items,
		});
	return items;
}

export function usePlaceAddressSearch(query: string) {
	return useQuery<AddressSearchItem[]>({
		queryKey: ["map", "place", "address", query],
		queryFn: () => fetchPlaceAddresses(query),
		enabled: query.trim().length > 0,
		staleTime: 1000 * 60,
	});
}

import type {
	SearchResultStore,
	StoreCategory,
	StoreMarker,
	StorePartnership,
} from "@/entities/store";
import { STORE_CATEGORY_CONFIG_MAP } from "@/entities/store";

type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getString(
	record: UnknownRecord,
	keys: string[],
): string | undefined {
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

export function pickList(value: unknown): unknown[] {
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

export function toSearchResultStore(value: unknown): SearchResultStore | null {
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

export function toStoreCategory(value: unknown): StoreCategory | undefined {
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

export function toStoreMarker(value: unknown): StoreMarker | null {
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

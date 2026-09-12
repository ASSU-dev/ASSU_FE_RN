import type { LatLng } from "@/shared/types/map";
import type { StoreMarker } from "../model/types";

const EARTH_RADIUS_KM = 6371;

/** 두 좌표 간 거리(km) — Haversine 공식 */
export function getDistanceKm(a: LatLng, b: LatLng): number {
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** 1km 미만은 m, 이상은 소수 1자리 km 표기 */
export function formatDistance(km: number): string {
	if (km < 1) return `${Math.round(km * 1000)}m`;
	return `${km.toFixed(1)}km`;
}

/** 카드/마커 라벨에 표시할 대표 혜택 텍스트 */
export function getPrimaryBenefit(store: StoreMarker): string | undefined {
	return store.partnerships?.[0]?.benefits[0] ?? store.benefit;
}

/** 대표 혜택을 제외한 나머지 혜택 개수 — "외 N가지 제휴" */
export function countExtraBenefits(store: StoreMarker): number {
	const total = store.partnerships
		? store.partnerships.reduce(
				(sum, partnership) => sum + partnership.benefits.length,
				0,
			)
		: store.benefit
			? 1
			: 0;
	return Math.max(total - 1, 0);
}

/** 카드 태그에 표시할 대표 학생회 이름 */
export function getPrimaryAdminName(store: StoreMarker): string | undefined {
	return store.partnerships?.[0]?.adminName;
}

/** "4인이상 식사시, 음료제공" → 조건(label) + 파란 강조(highlight) 분리 */
export function splitBenefitText(benefit?: string): {
	label?: string;
	highlight?: string;
} {
	if (!benefit) return {};
	const commaIndex = benefit.indexOf(",");
	if (commaIndex === -1) return { highlight: benefit };
	return {
		label: benefit.slice(0, commaIndex + 1),
		highlight: benefit.slice(commaIndex + 1).trim(),
	};
}

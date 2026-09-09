import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import Animated, {
	FadeInDown,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { StoreMarker } from "@/entities/store";
import {
	countExtraBenefits,
	formatDistance,
	getDistanceKm,
	getPrimaryAdminName,
	getPrimaryBenefit,
	StoreListCard,
	splitBenefitText,
} from "@/entities/store";
import { useSuggestionAdmins } from "@/entities/suggestion";
import {
	AdminChipRow,
	type AdminFilterItem,
	useMapFilterStore,
} from "@/features/map-filter";
import { useNearbyStores } from "@/features/map-search";
import { useGetUsablePartnershipQuery } from "@/features/store-list/api/useGetUsablePartnershipQuery";
import type { UsablePartnershipDTO } from "@/shared/api";
import type { LatLng } from "@/shared/types/map";
import {
	BottomSheetFlatList,
	SnapBottomSheet,
	type SnapBottomSheetRef,
} from "@/shared/ui/bottom-sheet";
import {
	KakaoMap,
	type KakaoMapHandle,
	type KakaoMapMarker,
	type MapBounds,
} from "@/shared/ui/kakao-map";
import { toViewport } from "../model/toViewport";
import { useUserLocation } from "../model/useUserLocation";
import { MapLocateButton } from "./MapLocateButton";
import { StudentSelectedStoreCard } from "./StudentSelectedStoreCard";

/** 매장 선택 시 최소 높이 — 핸들 + 학생회 칩 행만 노출 (피그마 실측 ≈90) */
const SNAP_MINI = 96;
/** 기본 peek — 칩 행 + 카드 1개 노출 (피그마 지도1 실측 ≈230) */
const SNAP_PEEK = 230;
/** 기본 핸들 높이: 위아래 패딩 10 + 막대 4 */
const SHEET_HANDLE_HEIGHT = 24;
/** 플로팅 카드/현재위치 버튼과 시트 사이 간격 */
const SHEET_GAP = 12;

interface VisibleViewport {
	bounds: MapBounds;
	center: LatLng | null;
}

type StudentMapStoreTarget = Pick<StoreMarker, "id" | "name">;

interface StudentMapViewProps {
	sheetPosition: SharedValue<number>;
	headerHeight: number;
	isSheetExpanded: boolean;
	onSheetExpandedChange: (expanded: boolean) => void;
	onStorePress?: (store: StudentMapStoreTarget) => void;
	/** 매장 선택 카드의 "제휴 인증하기" 버튼 탭 */
	onCertifyPress?: (store: StudentMapStoreTarget) => void;
	/** 외부에서 지정한 초기 선택 매장 */
	initialStoreId?: string;
	initialLat?: number;
	initialLng?: number;
	initialStoreName?: string;
	initialStoreImageUri?: string;
	initialStoreBenefit?: string;
	initialStoreTag?: string;
	/** 같은 매장을 다시 검색해 선택했을 때도 이동과 카드를 재실행한다. */
	initialSelectionKey?: string;
	/** nearbyStores에 초기 매장이 없을 때 플로팅 카드 탭 */
	onPinnedStorePress?: () => void;
	onPinnedStoreCertifyPress?: () => void;
}

export function StudentMapView({
	sheetPosition,
	headerHeight,
	isSheetExpanded,
	onSheetExpandedChange,
	onStorePress,
	onCertifyPress,
	initialStoreId,
	initialLat,
	initialLng,
	initialStoreName,
	initialStoreImageUri,
	initialStoreBenefit,
	initialStoreTag,
	initialSelectionKey,
	onPinnedStorePress,
	onPinnedStoreCertifyPress,
}: StudentMapViewProps) {
	const kakaoRef = useRef<KakaoMapHandle>(null);
	const sheetRef = useRef<SnapBottomSheetRef>(null);
	const suppressNextBoundsRef = useRef(false);
	const lastSelectionRequestRef = useRef<string | null>(null);
	const deliberatelyPannedRef = useRef(false);
	const insets = useSafeAreaInsets();
	const { center, myLocation, heading } = useUserLocation();
	const { storeCategory, adminId, toggleAdminId } = useMapFilterStore();

	// 로그인한 학생 소속(총학/단과대/학부) 학생회만 칩으로 노출
	const { data: suggestionAdmins = [] } = useSuggestionAdmins();
	const admins = useMemo<AdminFilterItem[]>(
		() =>
			suggestionAdmins.map((item) => ({ id: item.value, name: item.label })),
		[suggestionAdmins],
	);

	useEffect(() => {
		if (__DEV__ && admins.length > 0)
			console.log("[StudentMapView] 학생회 칩:", admins);
	}, [admins]);

	const [visibleViewport, setVisibleViewport] =
		useState<VisibleViewport | null>(null);
	// 맵이 idle 이벤트를 보내기 전까지는 GPS 기반 초기 viewport 사용
	const viewport = resolveViewport(
		center,
		visibleViewport,
		deliberatelyPannedRef.current,
	);
	// 지도 마커는 현재 화면 범위와 카테고리 필터를 반영한다.
	const { data: markerStores = [] } = useNearbyStores(viewport, {
		storeCategory: storeCategory ?? undefined,
	});
	// 시트 리스트는 지도 범위와 무관하게 이용 가능한 전체 제휴를 조회한다.
	const { data: partnershipResponse } = useGetUsablePartnershipQuery({
		all: true,
		adminId: adminId ? Number(adminId) : undefined,
	});
	const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

	const pinnedStore = useMemo<StoreMarker | null>(() => {
		if (
			!initialStoreId ||
			initialLat === undefined ||
			initialLng === undefined ||
			!Number.isFinite(initialLat) ||
			!Number.isFinite(initialLng) ||
			Math.abs(initialLat) > 90 ||
			Math.abs(initialLng) > 180
		) {
			return null;
		}
		return {
			id: initialStoreId,
			name: initialStoreName ?? "",
			address: "",
			latitude: initialLat,
			longitude: initialLng,
			hasPartner: true,
			rate: 0,
			imageUri: initialStoreImageUri,
			benefit: initialStoreBenefit,
			partnerships: initialStoreTag
				? [{ adminName: initialStoreTag, benefits: [] }]
				: undefined,
		};
	}, [
		initialStoreId,
		initialLat,
		initialLng,
		initialStoreName,
		initialStoreImageUri,
		initialStoreBenefit,
		initialStoreTag,
	]);
	const partnerMarkerStores = useMemo(() => {
		const stores = markerStores.filter((store) => store.hasPartner);
		// 검색 매장은 현재 지도 범위/카테고리 밖이어도 선택 마커를 유지한다.
		if (pinnedStore && !stores.some((store) => store.id === pinnedStore.id)) {
			return [...stores, pinnedStore];
		}
		return stores;
	}, [markerStores, pinnedStore]);
	const partnerListStores = partnershipResponse?.result ?? [];
	const selectedStore =
		partnerMarkerStores.find((store) => store.id === selectedStoreId) ?? null;

	useEffect(() => {
		if (selectedStoreId && !selectedStore && selectedStoreId !== initialStoreId)
			setSelectedStoreId(null);
	}, [selectedStore, selectedStoreId, initialStoreId]);

	// 검색 선택과 지도 칩 선택이 같은 카드/시트/지도 이동 흐름을 사용한다.
	const selectStore = useCallback(
		(store: StoreMarker, refreshBounds: boolean) => {
			setSelectedStoreId(store.id);
			sheetRef.current?.snapToIndex(0);
			suppressNextBoundsRef.current = !refreshBounds;
			deliberatelyPannedRef.current = true;
			kakaoRef.current?.panTo(store.latitude, store.longitude);
		},
		[],
	);

	useEffect(() => {
		if (!pinnedStore) return;
		const requestKey = JSON.stringify([
			pinnedStore.id,
			pinnedStore.latitude,
			pinnedStore.longitude,
			initialSelectionKey,
		]);
		if (lastSelectionRequestRef.current === requestKey) return;
		lastSelectionRequestRef.current = requestKey;
		selectStore(pinnedStore, true);
	}, [pinnedStore, initialSelectionKey, selectStore]);

	const mapMarkers = useMemo<KakaoMapMarker[]>(
		() =>
			partnerMarkerStores.map((store) => ({
				id: store.id,
				name: store.name,
				latitude: store.latitude,
				longitude: store.longitude,
				hasPartner: true,
				category: store.category,
				benefit: getPrimaryBenefit(store),
			})),
		[partnerMarkerStores],
	);

	// 마지막 스냅은 화면 상단까지 펼친다.
	const snapPoints = useMemo(() => [SNAP_MINI, SNAP_PEEK, "45%", "100%"], []);
	const handleSheetChange = useCallback(
		(index: number) => onSheetExpandedChange(index === snapPoints.length - 1),
		[onSheetExpandedChange, snapPoints.length],
	);
	const headerOffset = Math.max(0, headerHeight - SHEET_HANDLE_HEIGHT);
	// 목록 크기는 고정하고 위치만 이동해 드래그 중 레이아웃 재계산을 줄인다.
	const sheetContentStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: -Math.min(headerOffset, sheetPosition.value) }],
	}));

	const handleFocusToMyLocation = () => {
		if (!myLocation) return;
		deliberatelyPannedRef.current = true;
		kakaoRef.current?.panTo(myLocation.lat, myLocation.lng);
	};

	// 마커 선택 시 시트를 최소(칩 행만)로 내려 플로팅 카드 공간을 확보한다.
	// panTo 후 발생하는 idle → onRegionChange는 억제해 불필요한 재조회를 막는다.
	const handleMarkerPress = (markerId: string) => {
		const store = partnerMarkerStores.find((s) => s.id === markerId);
		if (store) selectStore(store, store.id === pinnedStore?.id);
	};

	// 지도 빈 곳 탭: 선택 카드만 닫고 시트 위치는 사용자가 둔 그대로 유지한다
	const handleMapPress = () => {
		setSelectedStoreId(null);
	};

	const renderPartnershipCard = (partnership: UsablePartnershipDTO) => {
		const hasCondition = partnership.people != null || partnership.cost != null;
		let benefitLabel: string | undefined;
		let benefitHighlight: string | undefined;

		if (hasCondition) {
			if (partnership.criterionType === "HEADCOUNT" && partnership.people) {
				benefitLabel = `${partnership.people}인 이상 이용 시, `;
			} else if (partnership.criterionType === "PRICE" && partnership.cost) {
				benefitLabel = `${partnership.cost.toLocaleString()}원 이상 시, `;
			}
			if (
				partnership.criterionType === "PRICE" ||
				partnership.criterionType === "HEADCOUNT"
			) {
				benefitHighlight = partnership.category ?? " 혜택";
			} else if (
				partnership.optionType === "DISCOUNT" &&
				partnership.discountRate
			) {
				benefitHighlight = `${partnership.discountRate}% 할인`;
			}
		} else {
			benefitLabel = partnership.note ?? undefined;
		}

		const store =
			partnership.storeId !== undefined
				? {
						id: String(partnership.storeId),
						name: partnership.partnerName ?? "",
					}
				: null;

		return (
			<StoreListCard
				name={partnership.partnerName ?? ""}
				imageUri={partnership.partnerProfileUrl ?? undefined}
				benefitLabel={benefitLabel}
				benefitHighlight={benefitHighlight}
				extraBenefitCount={partnership.extraCount}
				tag={partnership.adminName}
				onPress={store && onStorePress ? () => onStorePress(store) : undefined}
			/>
		);
	};

	return (
		<View className="flex-1 bg-canvas">
			<KakaoMap
				ref={kakaoRef}
				initialCenter={center ?? undefined}
				myLocation={myLocation}
				heading={heading}
				markers={mapMarkers}
				categoryMarkersEnabled
				clusteringEnabled
				selectedMarkerId={selectedStoreId}
				onMarkerPress={handleMarkerPress}
				onMapPress={handleMapPress}
				onRegionChange={(bounds) => {
					if (suppressNextBoundsRef.current) {
						suppressNextBoundsRef.current = false;
						return;
					}
					setVisibleViewport((prev) => {
						if (
							prev &&
							isSameCenter(prev.center, center) &&
							!isBoundsShiftedEnough(prev.bounds, bounds)
						) {
							return prev;
						}
						return { bounds, center };
					});
				}}
			/>
			<MapLocateButton
				onPress={handleFocusToMyLocation}
				disabled={!myLocation}
				placement="bottom-left"
				bottomOffset={SNAP_PEEK + SHEET_GAP}
			/>
			{selectedStore ||
			(selectedStoreId === initialStoreId && initialStoreName) ? (
				<Animated.View
					entering={FadeInDown.duration(220)}
					className="absolute left-card-p right-card-p"
					style={{ bottom: SNAP_MINI + SHEET_GAP }}
				>
					<StudentSelectedStoreCard
						name={selectedStore?.name ?? initialStoreName ?? ""}
						imageUri={selectedStore?.imageUri ?? initialStoreImageUri}
						benefitLabel={
							selectedStore
								? splitBenefitText(getPrimaryBenefit(selectedStore)).label
								: undefined
						}
						benefitHighlight={
							selectedStore
								? splitBenefitText(getPrimaryBenefit(selectedStore)).highlight
								: undefined
						}
						extraBenefitCount={
							selectedStore ? countExtraBenefits(selectedStore) : 0
						}
						distanceText={
							selectedStore && myLocation
								? formatDistance(
										getDistanceKm(myLocation, {
											lat: selectedStore.latitude,
											lng: selectedStore.longitude,
										}),
									)
								: undefined
						}
						tag={selectedStore ? getPrimaryAdminName(selectedStore) : undefined}
						onPress={
							selectedStore && onStorePress
								? () => onStorePress(selectedStore)
								: onPinnedStorePress
						}
						onCertifyPress={
							selectedStore && onCertifyPress
								? () => onCertifyPress(selectedStore)
								: (onPinnedStoreCertifyPress ?? (() => {}))
						}
					/>
				</Animated.View>
			) : null}
			<SnapBottomSheet
				ref={sheetRef}
				snapPoints={snapPoints}
				index={0}
				topInset={0}
				animatedPosition={sheetPosition}
				onChange={handleSheetChange}
				handleIndicatorStyle={{ opacity: isSheetExpanded ? 0 : 1 }}
				backgroundStyle={
					isSheetExpanded
						? { borderTopLeftRadius: 0, borderTopRightRadius: 0 }
						: undefined
				}
			>
				<Animated.View
					className="flex-1"
					style={[{ marginTop: headerOffset }, sheetContentStyle]}
				>
					{admins.length > 0 && (
						<View className="shrink-0 bg-canvas pb-gutter">
							<AdminChipRow
								admins={admins}
								selectedAdminId={adminId}
								onToggleAdmin={toggleAdminId}
							/>
						</View>
					)}
					<BottomSheetFlatList
						data={partnerListStores}
						keyExtractor={(partnership, index) =>
							String(partnership.partnershipId ?? partnership.storeId ?? index)
						}
						style={{ flex: 1 }}
						contentContainerStyle={{
							paddingTop: 10,
							paddingBottom: insets.bottom + 24,
						}}
						ItemSeparatorComponent={StoreListSeparator}
						renderItem={({ item }) => renderPartnershipCard(item)}
					/>
				</Animated.View>
			</SnapBottomSheet>
		</View>
	);
}

function resolveViewport(
	center: LatLng | null,
	visibleViewport: VisibleViewport | null,
	preserveVisibleViewport: boolean,
): MapBounds | null {
	if (!center) return null;
	if (
		visibleViewport &&
		(preserveVisibleViewport || isSameCenter(visibleViewport.center, center))
	) {
		return visibleViewport.bounds;
	}
	return toViewport(center);
}

function isSameCenter(left: LatLng | null, right: LatLng | null): boolean {
	if (!left || !right) return left === right;
	return left.lat === right.lat && left.lng === right.lng;
}

/** NW 코너 기준 약 500m(≈0.005°) 이상 이동했을 때만 true — 소폭 이동 re-fetch 방지 */
function isBoundsShiftedEnough(
	prev: MapBounds | null,
	next: MapBounds,
): boolean {
	if (!prev) return true;
	return (
		Math.abs(prev.lat1 - next.lat1) > 0.003 ||
		Math.abs(prev.lng1 - next.lng1) > 0.003
	);
}

function StoreListSeparator() {
	return <View className="mx-[12px] h-[1px] bg-neutral" />;
}

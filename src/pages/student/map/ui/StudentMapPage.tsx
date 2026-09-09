import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryChipRow, useMapFilterStore } from "@/features/map-filter";
import { MapSearchBar, StudentMapView } from "@/widgets/map";

/** MapSearchBar(insets.top + 12 + 44 + 12) 바로 아래 */
const CHIP_ROW_TOP_OFFSET = 70;

export function StudentMapPage() {
	const insets = useSafeAreaInsets();
	const { storeCategory, toggleStoreCategory } = useMapFilterStore();
	const {
		preSelectStoreId,
		preSelectLat,
		preSelectLng,
		preSelectName,
		preSelectImageUri,
		preSelectBenefit,
		preSelectTag,
		preSelectRequestId,
	} = useLocalSearchParams<{
		preSelectStoreId?: string;
		preSelectLat?: string;
		preSelectLng?: string;
		preSelectName?: string;
		preSelectImageUri?: string;
		preSelectBenefit?: string;
		preSelectTag?: string;
		preSelectRequestId?: string;
	}>();

	const pinnedStoreId = preSelectStoreId ? Number(preSelectStoreId) : undefined;

	return (
		<View className="flex-1 bg-canvas">
			<StudentMapView
				onStorePress={(store) =>
					router.push({
						pathname: "/(protected)/student/store/[storeId]/detail",
						params: { storeId: store.id, storeName: store.name },
					})
				}
				onCertifyPress={(store) =>
					router.push({
						pathname: "/(protected)/student/partnership-benefit-select",
						params: { storeId: store.id },
					})
				}
				initialStoreId={preSelectStoreId}
				initialLat={preSelectLat ? Number(preSelectLat) : undefined}
				initialLng={preSelectLng ? Number(preSelectLng) : undefined}
				initialStoreName={preSelectName}
				initialStoreImageUri={preSelectImageUri}
				initialStoreBenefit={preSelectBenefit}
				initialStoreTag={preSelectTag}
				initialSelectionKey={preSelectRequestId}
				onPinnedStorePress={
					pinnedStoreId
						? () =>
								router.push({
									pathname: "/(protected)/student/store/[storeId]/detail",
									params: { storeId: pinnedStoreId, storeName: preSelectName },
								})
						: undefined
				}
				onPinnedStoreCertifyPress={
					pinnedStoreId
						? () =>
								router.push({
									pathname: "/(protected)/student/partnership-benefit-select",
									params: { storeId: pinnedStoreId },
								})
						: undefined
				}
			/>
			<MapSearchBar
				placeholder="다양한 제휴매장을 검색해보세요"
				onPress={() => router.push("/(protected)/student/map-search")}
			/>
			<View
				className="absolute left-0 right-0"
				style={{ top: insets.top + CHIP_ROW_TOP_OFFSET }}
			>
				<CategoryChipRow
					selectedCategory={storeCategory}
					onToggleCategory={toggleStoreCategory}
				/>
			</View>
		</View>
	);
}

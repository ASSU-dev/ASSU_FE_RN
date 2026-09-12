import { router } from "expo-router";
import { Alert, Keyboard } from "react-native";
import type { SearchResultStore } from "@/entities/store";
import { useSearchStoreLocation } from "@/features/map-search";
import { MapSearchPage } from "@/pages/map-search";

export default function StudentMapSearchScreen() {
	const { mutate: locateStore, isPending } = useSearchStoreLocation();

	const handleStorePress = (store: SearchResultStore) => {
		if (!store.storeId || isPending) return;
		Keyboard.dismiss();
		locateStore(store, {
			onSuccess: (locatedStore) => {
				router.dismissTo({
					pathname: "/(protected)/student/(tabs)/map",
					params: {
						preSelectStoreId: locatedStore.storeId,
						preSelectLat: String(locatedStore.latitude),
						preSelectLng: String(locatedStore.longitude),
						preSelectName: locatedStore.name,
						preSelectImageUri: locatedStore.imageUri ?? "",
						preSelectBenefit: locatedStore.benefit ?? "",
						preSelectTag: locatedStore.tag ?? "",
						preSelectRequestId: String(Date.now()),
					},
				});
			},
			onError: () => {
				Alert.alert("매장 위치 확인 실패", "잠시 후 다시 시도해 주세요.");
			},
		});
	};

	return (
		<MapSearchPage
			userRole="student"
			onStorePress={isPending ? undefined : handleStorePress}
		/>
	);
}

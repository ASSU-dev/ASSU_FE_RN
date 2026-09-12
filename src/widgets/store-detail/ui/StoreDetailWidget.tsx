import { router } from "expo-router";
import { useEffect } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { StoreImageCarousel } from "@/entities/store/ui/StoreImageCarousel";
import { StorePartnershipList } from "@/features/store-detail/ui/StorePartnershipList";
import { Location, MapIcon } from "@/shared/assets/icons";
import { AppTopBar } from "@/shared/ui/app-top-bar/AppTopBar";
import { MediumButton } from "@/shared/ui/buttons/SubmitButton";
import { PageLayout } from "@/shared/ui/layout/PageLayout";
import { useStoreDetailData } from "../model/useStoreDetailData";

interface StoreDetailWidgetProps {
	storeId: number;
	storeName?: string;
}

export function StoreDetailWidget({
	storeId,
	storeName: fallbackName,
}: StoreDetailWidgetProps) {
	const {
		store,
		benefits,
		selectedBenefitId,
		setSelectedBenefitId,
		selectedBenefit,
		title,
		address,
		images,
		isLoading,
		isError,
	} = useStoreDetailData({ storeId, fallbackName });

	const isExternal = store?.linkType === "EXTERNAL";

	useEffect(() => {
		if (isExternal) {
			router.replace("/(protected)/student/external-store-link");
		}
	}, [isExternal]);

	const handleViewOnMap = () => {
		if (!store?.latitude || !store?.longitude) return;
		router.push({
			pathname: "/(protected)/student/(tabs)/map",
			params: {
				preSelectStoreId: String(store.storeId),
				preSelectLat: String(store.latitude),
				preSelectLng: String(store.longitude),
				preSelectName: store.storeName ?? "",
				preSelectImageUri: store.profileUrl ?? "",
			},
		});
	};

	const handleCertify = () => {
		if (!selectedBenefit || !store) return;
		router.push({
			pathname: "/(protected)/student/partnership-benefit-select",
			params: {
				storeId: store.storeId,
				preSelectedContentId: Number(selectedBenefit.id),
			},
		});
	};

	return (
		<PageLayout
			withTopInset
			withBottomInset
			contentContainerClassName="flex-1"
			header={<AppTopBar title={title} titleAlign="left" />}
		>
			{isLoading || isExternal ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator />
				</View>
			) : isError ? (
				<View className="flex-1 items-center justify-center px-screen-m">
					<Text className="text-center text-sm text-content-secondary">
						가게 상세 정보를 찾을 수 없습니다
					</Text>
				</View>
			) : (
				<ScrollView showsVerticalScrollIndicator={false}>
					<StoreImageCarousel images={images} />

					<View className="gap-3 px-screen-m pt-5">
						<Text className="text-[20px] font-bold text-content-primary">
							{title}
						</Text>

						{address ? (
							<View className="flex-row items-center gap-1">
								<Location width={16} height={16} />
								<Text className="font-medium text-sm text-content-primary">
									{address}
								</Text>
								<Pressable
									className="flex-row items-center gap-1 ml-2"
									onPress={handleViewOnMap}
								>
									<MapIcon width={16} height={16} />
									<Text className="font-medium text-sm text-primary">위치</Text>
								</Pressable>
							</View>
						) : null}
					</View>

					<View className="mx-screen-m my-5 h-[2px] bg-neutral" />

					<View className="gap-3 px-screen-m pb-8">
						<View className="flex-row items-center justify-between">
							<Text className="font-bold text-lg text-content-primary">
								제휴 목록
							</Text>
							<Text className="font-medium text-xs text-content-tertiary">
								하나의 제휴를 선택해 주세요
							</Text>
						</View>

						<StorePartnershipList
							benefits={benefits}
							selectedId={selectedBenefitId}
							onSelect={setSelectedBenefitId}
						/>
					</View>
				</ScrollView>
			)}

			<View className="border-t border-neutral bg-canvas px-screen-m pb-[4px] pt-3">
				<MediumButton
					onPress={handleCertify}
					disabled={selectedBenefitId === null}
				>
					제휴 인증하기
				</MediumButton>
			</View>
		</PageLayout>
	);
}

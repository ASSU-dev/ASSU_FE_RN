import { router } from "expo-router";
import { Linking, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	CheckFillIcon,
	CloseIcon,
	ExitRightIcon,
	Logo,
} from "@/shared/assets/icons";
import { MediumButton } from "@/shared/ui/buttons/SubmitButton";

// TODO: 실제 외부 링크로 교체
const EXTERNAL_STORE_URL = "https://assu.ssu.ac.kr";

export function ExternalStoreLinkPage() {
	const insets = useSafeAreaInsets();

	const handleOpenLink = () => {
		Linking.openURL(EXTERNAL_STORE_URL);
	};

	return (
		<View
			className="flex-1 bg-canvas"
			style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
		>
			<View className="px-[10px] py-[13px]">
				<Pressable onPress={() => router.back()} hitSlop={8}>
					<CloseIcon width={24} height={24} />
				</Pressable>
			</View>

			<View className="flex-1 items-center justify-center gap-8 px-screen-m">
				<Logo width={96} height={40} />

				<View className="items-center gap-3">
					<Text className="text-center text-[24px] font-bold leading-[1.3] text-content-primary">
						{"이 제휴는 외부 링크에서\n인증해요"}
					</Text>
					<Text className="text-center text-sm leading-[1.5] text-content-secondary">
						{
							"해당 제휴는 외부 페이지에서 이용할 수 있어요\n지금 외부 링크로 이동할까요?"
						}
					</Text>
				</View>

				<View className="w-full gap-4">
					<View className="flex-row items-center gap-3">
						<View className="h-[40px] w-[40px] items-center justify-center rounded-[8px] border border-neutral">
							<ExitRightIcon width={20} height={20} />
						</View>
						<View className="flex-1 gap-0.5">
							<Text className="text-sm font-semibold text-content-primary">
								외부 페이지로 이동해요
							</Text>
							<Text className="text-xs text-content-secondary">
								바로 제휴 인증이 가능한 페이지로 연결됩니다
							</Text>
						</View>
					</View>

					<View className="flex-row items-center gap-3">
						<View className="h-[40px] w-[40px] items-center justify-center rounded-[8px] border border-neutral">
							<CheckFillIcon width={20} height={20} />
						</View>
						<View className="flex-1 gap-0.5">
							<Text className="text-sm font-semibold text-content-primary">
								해당 페이지에서 제휴를 받아요
							</Text>
							<Text className="text-xs text-content-secondary">
								각 페이지 마다 인증 절차가 달라요
							</Text>
						</View>
					</View>
				</View>
			</View>

			<View className="gap-3 px-screen-m pb-8 pt-3">
				<MediumButton onPress={handleOpenLink}>
					외부 링크로 이동하기
				</MediumButton>
				<Pressable
					onPress={() => router.back()}
					className="w-full items-center justify-center rounded-[0.75rem] bg-neutral py-[1.12rem]"
				>
					<Text className="text-center text-[1.25rem] font-bold text-content-secondary">
						취소
					</Text>
				</Pressable>
			</View>
		</View>
	);
}

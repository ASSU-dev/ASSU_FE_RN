import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot from "react-native-view-shot";
import { colorTokens } from "@/shared/styles/tokens";

export function QrViewPage() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const viewShotRef = useRef<ViewShot>(null);
	const [saving, setSaving] = useState(false);

	const qrValue = `https://assu.ssu.ac.kr/partnership/${id}`;

	const handleSave = async () => {
		if (saving) return;
		setSaving(true);
		try {
			const { status } = await MediaLibrary.requestPermissionsAsync(
				Platform.OS === "ios",
			);
			if (status !== "granted") {
				Alert.alert(
					"권한 필요",
					"제휴 QR 코드를 사진 보관함에 저장하려면 사진 저장 권한을 허용해 주세요.",
				);
				return;
			}
			const uri = await viewShotRef.current?.capture?.();
			if (!uri) return;
			await MediaLibrary.saveToLibraryAsync(uri);
			Alert.alert("저장 완료", "QR 코드가 갤러리에 저장되었습니다.");
		} catch {
			Alert.alert("오류", "QR 코드 저장에 실패했습니다.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
			{/* 닫기 버튼 */}
			<View className="px-[10px] py-[13px]">
				<Pressable onPress={() => router.back()} hitSlop={8}>
					<Ionicons name="close" size={24} color={colorTokens.contentPrimary} />
				</Pressable>
			</View>

			{/* 본문 */}
			<View className="flex-1 items-center justify-center gap-[15px]">
				{/* 타이틀 */}
				<View className="items-center gap-[15px]">
					<Text className="text-[30px] font-semibold text-content-primary tracking-[-0.32px]">
						제휴 QR
					</Text>
					<Text className="text-[15px] text-content-secondary tracking-[-0.32px]">
						아래의 QR을 다운받아 포스터를 제작해 주세요!
					</Text>
				</View>

				{/* QR 코드 */}
				<ViewShot ref={viewShotRef} options={{ format: "png", quality: 1 }}>
					<View className="p-3 bg-canvas">
						<QRCode value={qrValue} size={200} />
					</View>
				</ViewShot>

				{/* 저장 버튼 */}
				<Pressable
					onPress={handleSave}
					disabled={saving}
					className="bg-neutral rounded-lg px-[20px] py-[10px]"
				>
					<Text className="text-[13px] font-semibold text-content-secondary tracking-[-0.32px]">
						{saving ? "저장 중..." : "QR 저장하기"}
					</Text>
				</Pressable>
			</View>
		</View>
	);
}

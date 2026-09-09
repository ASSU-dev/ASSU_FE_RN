import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LocationIcon } from "@/shared/assets/icons";
import { shadows } from "@/shared/styles/shadows";

interface MapSearchBarProps {
	placeholder?: string;
	onPress: () => void;
}

export function MapSearchBar({
	placeholder = "찾으시는 제휴 가게가 없나요?",
	onPress,
}: MapSearchBarProps) {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="absolute left-0 right-0 top-0 px-card-p pb-3"
			style={{ paddingTop: insets.top + 12 }}
		>
			<Pressable
				onPress={onPress}
				className="flex-row items-center gap-gutter rounded-[8px] bg-neutral p-gutter"
				style={shadows.neutral}
			>
				<LocationIcon width={14} height={18} />
				<Text className="font-regular text-sm leading-caption tracking-caption text-content-secondary">
					{placeholder}
				</Text>
			</Pressable>
		</View>
	);
}

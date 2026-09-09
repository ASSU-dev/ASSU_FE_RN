import BottomSheet from "@gorhom/bottom-sheet";
import type { ReactNode } from "react";
import { forwardRef } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import { colorTokens } from "@/shared/styles/tokens";

export type SnapBottomSheetRef = BottomSheet;

interface SnapBottomSheetProps {
	/** 스냅 지점 목록 (ex. ["15%", "50%", "100%"]) — 낮은 위치부터 */
	snapPoints: (string | number)[];
	/** 초기 스냅 인덱스 */
	index?: number;
	/** 스냅 위치 변경 콜백 — full 전환 등 레이아웃 정책은 호출부가 결정 */
	onChange?: (index: number) => void;
	/** 컨테이너 상단에서 시트가 넘을 수 없는 한계선(px) — "100%" 스냅의 상한 */
	topInset?: number;
	animatedPosition?: SharedValue<number>;
	handleIndicatorStyle?: StyleProp<ViewStyle>;
	enablePanDownToClose?: boolean;
	backgroundStyle?: StyleProp<ViewStyle>;
	children: ReactNode;
}

/**
 * 다단계 스냅 바텀시트 공용 래퍼 (@gorhom/bottom-sheet 기반).
 * 내부에 스크롤 리스트가 필요하면 children으로 BottomSheetFlatList /
 * BottomSheetScrollView(같은 패키지)를 사용해야 시트 드래그와 충돌하지 않는다.
 */
export const SnapBottomSheet = forwardRef<
	SnapBottomSheetRef,
	SnapBottomSheetProps
>(function SnapBottomSheet(
	{
		snapPoints,
		index = 0,
		onChange,
		topInset,
		animatedPosition,
		handleIndicatorStyle,
		enablePanDownToClose = false,
		backgroundStyle,
		children,
	},
	ref,
) {
	return (
		<BottomSheet
			ref={ref}
			index={index}
			snapPoints={snapPoints}
			onChange={onChange}
			topInset={topInset}
			animatedPosition={animatedPosition}
			enableDynamicSizing={false}
			enablePanDownToClose={enablePanDownToClose}
			handleIndicatorStyle={[
				{
					backgroundColor: colorTokens.neutralVariant,
					width: 36,
				},
				handleIndicatorStyle,
			]}
			backgroundStyle={[
				{
					backgroundColor: colorTokens.canvas,
					borderTopLeftRadius: 30,
					borderTopRightRadius: 30,
				},
				backgroundStyle,
			]}
		>
			{children}
		</BottomSheet>
	);
});

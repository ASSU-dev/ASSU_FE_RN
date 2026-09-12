import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ComponentType } from "react";
import type { SvgProps } from "react-native-svg";
import type { UserType } from "@/entities/user/model/types";
import {
	AccountManagementIcon,
	HomeIcon,
	Location,
	SuggestionBoxIcon,
} from "@/shared/assets/icons";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/** Ionicons 기반 탭 아이콘 (활성/비활성 이름 분리) */
interface IoniconTabIcon {
	activeIconName: IoniconName;
	inactiveIconName: IoniconName;
	Icon?: never;
}

/** SVG 컴포넌트 기반 탭 아이콘 (color prop으로 활성/비활성 틴트) */
interface SvgTabIcon {
	Icon: ComponentType<SvgProps>;
	activeIconName?: never;
	inactiveIconName?: never;
}

export type TabIcon = IoniconTabIcon | SvgTabIcon;

export type TabItem = TabIcon & {
	route: string;
	label: string;
};

export const TAB_CONFIG: Record<UserType, TabItem[]> = {
	STUDENT: [
		{
			route: "home",
			label: "홈",
			Icon: HomeIcon,
		},
		{
			route: "map",
			label: "지도",
			Icon: Location,
		},
		{
			route: "suggestion",
			label: "제휴건의함",
			Icon: SuggestionBoxIcon,
		},
		{
			route: "profile",
			label: "프로필",
			Icon: AccountManagementIcon,
		},
	],
	ADMIN: [
		{
			route: "home",
			label: "홈",
			Icon: HomeIcon,
		},
		{
			route: "map",
			label: "지도",
			Icon: Location,
		},
		{
			route: "dashboard",
			label: "대시보드",
			activeIconName: "bar-chart",
			inactiveIconName: "bar-chart-outline",
		},
		{
			route: "chat",
			label: "채팅",
			activeIconName: "chatbubble",
			inactiveIconName: "chatbubble-outline",
		},
		{
			route: "profile",
			label: "프로필",
			Icon: AccountManagementIcon,
		},
	],
	PARTNER: [
		{
			route: "home",
			label: "홈",
			Icon: HomeIcon,
		},
		{
			route: "map",
			label: "지도",
			Icon: Location,
		},
		{
			route: "chat",
			label: "채팅",
			activeIconName: "chatbubble",
			inactiveIconName: "chatbubble-outline",
		},
		{
			route: "profile",
			label: "프로필",
			Icon: AccountManagementIcon,
		},
	],
};

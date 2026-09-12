import { useState } from "react";
import { usePlaceAddressSearch } from "@/entities/place";
import { useDebounce } from "@/shared/lib/hooks/useDebounce";
import type { AddressSearchItem } from "@/shared/ui/address-search/types";

type AddressSearchTarget = "partner" | "admin" | null;

type UseSignupOverlaysParams = {
	adminOfficeAddressId: string | null;
	partnerOfficeAddressId: string | null;
	onSendVerificationCode: () => void;
	onSelectAdminOfficeAddress: (item: AddressSearchItem) => void;
	onSelectPartnerOfficeAddress: (item: AddressSearchItem) => void;
};

export function useSignupOverlays({
	adminOfficeAddressId,
	partnerOfficeAddressId,
	onSendVerificationCode,
	onSelectAdminOfficeAddress,
	onSelectPartnerOfficeAddress,
}: UseSignupOverlaysParams) {
	const [isResendSheetVisible, setResendSheetVisible] = useState(false);
	const [isAddressSearchVisible, setAddressSearchVisible] = useState(false);
	const [addressSearchTarget, setAddressSearchTarget] =
		useState<AddressSearchTarget>(null);
	const [addressQuery, setAddressQuery] = useState("");
	const debouncedAddressQuery = useDebounce(addressQuery, 300);

	const { data: addressItems = [], isFetching: isAddressSearchLoading } =
		usePlaceAddressSearch(debouncedAddressQuery.trim());

	const closeAddressSearch = () => {
		setAddressSearchVisible(false);
		setAddressSearchTarget(null);
		setAddressQuery("");
	};

	return {
		resendSheet: {
			visible: isResendSheetVisible,
			open: () => setResendSheetVisible(true),
			close: () => setResendSheetVisible(false),
			action: () => {
				onSendVerificationCode();
				setResendSheetVisible(false);
			},
		},
		addressSearch: {
			visible: isAddressSearchVisible,
			items: addressItems,
			isLoading: isAddressSearchLoading,
			query: addressQuery,
			onQueryChange: setAddressQuery,
			selectedItemId:
				addressSearchTarget === "admin"
					? adminOfficeAddressId
					: partnerOfficeAddressId,
			openForPartner: () => {
				setAddressSearchTarget("partner");
				setAddressQuery("");
				setAddressSearchVisible(true);
			},
			openForAdmin: () => {
				setAddressSearchTarget("admin");
				setAddressQuery("");
				setAddressSearchVisible(true);
			},
			close: closeAddressSearch,
			selectItem: (item: AddressSearchItem) => {
				if (addressSearchTarget === "admin") {
					onSelectAdminOfficeAddress(item);
				} else {
					onSelectPartnerOfficeAddress(item);
				}
				closeAddressSearch();
			},
		},
	};
}

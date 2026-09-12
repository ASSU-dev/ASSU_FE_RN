import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";
import { useReviewDraftStore } from "./useReviewDraftStore";

const MAX_REVIEW_IMAGES = 3;

export function useReviewImagePicker() {
	const images = useReviewDraftStore((state) => state.images);
	const setImages = useReviewDraftStore((state) => state.setImages);

	const selectImages = async () => {
		const remainingCount = MAX_REVIEW_IMAGES - images.length;
		if (remainingCount <= 0) return;

		// iOS의 시스템 사진 선택기는 보관함 권한 없이 선택한 사진만 전달합니다.
		if (Platform.OS !== "ios") {
			const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

			if (!permission.granted) {
				Alert.alert(
					"사진 접근 권한 필요",
					"리뷰 사진을 선택하려면 사진 접근 권한을 허용해 주세요.",
				);
				return;
			}
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsMultipleSelection: true,
			selectionLimit: remainingCount,
			quality: 0.9,
		});

		if (result.canceled) return;

		const selectedImages = result.assets.map((asset, index) => ({
			uri: asset.uri,
			name: asset.fileName ?? `review-${Date.now()}-${index}.jpg`,
			type: asset.mimeType ?? "image/jpeg",
		}));

		setImages([...images, ...selectedImages].slice(0, MAX_REVIEW_IMAGES));
	};

	const removeImage = (uri: string) => {
		setImages(images.filter((image) => image.uri !== uri));
	};

	return {
		images,
		maxImages: MAX_REVIEW_IMAGES,
		selectImages,
		removeImage,
	};
}

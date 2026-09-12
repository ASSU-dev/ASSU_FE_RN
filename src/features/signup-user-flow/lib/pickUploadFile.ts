import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";
import type { SignupUploadFile } from "../model/types";

const DOCUMENT_TYPES = ["image/*", "application/pdf"];

function buildFallbackName(mimeType: string) {
	const extension = mimeType.includes("pdf") ? "pdf" : "jpg";
	return `upload-${Date.now()}.${extension}`;
}

async function pickFromLibrary(): Promise<SignupUploadFile | null> {
	// iOS의 시스템 사진 선택기는 보관함 권한 없이 선택한 사진만 전달합니다.
	if (Platform.OS !== "ios") {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) {
			Alert.alert(
				"사진 접근 권한 필요",
				"설정에서 사진 접근을 허용한 뒤 다시 시도해주세요.",
			);
			return null;
		}
	}

	const result = await ImagePicker.launchImageLibraryAsync({
		mediaTypes: ["images"],
		quality: 0.8,
	});
	if (result.canceled) return null;

	const asset = result.assets[0];
	if (!asset) return null;

	const mimeType = asset.mimeType ?? "image/jpeg";
	return {
		uri: asset.uri,
		name: asset.fileName ?? buildFallbackName(mimeType),
		mimeType,
	};
}

async function pickFromFiles(): Promise<SignupUploadFile | null> {
	const result = await DocumentPicker.getDocumentAsync({
		type: DOCUMENT_TYPES,
		copyToCacheDirectory: true,
	});
	if (result.canceled) return null;

	const asset = result.assets[0];
	if (!asset) return null;

	const mimeType = asset.mimeType ?? "application/octet-stream";
	return {
		uri: asset.uri,
		name: asset.name || buildFallbackName(mimeType),
		mimeType,
	};
}

/** 사진 보관함 또는 파일 앱에서 업로드할 파일을 하나 고른다. 취소 시 null */
export function pickUploadFile(): Promise<SignupUploadFile | null> {
	return new Promise((resolve) => {
		Alert.alert(
			"파일 업로드",
			"업로드할 방법을 선택해주세요.",
			[
				{
					text: "사진 보관함",
					onPress: () =>
						pickFromLibrary()
							.then(resolve)
							.catch(() => resolve(null)),
				},
				{
					text: "파일 선택",
					onPress: () =>
						pickFromFiles()
							.then(resolve)
							.catch(() => resolve(null)),
				},
				{ text: "취소", style: "cancel", onPress: () => resolve(null) },
			],
			{ onDismiss: () => resolve(null) },
		);
	});
}

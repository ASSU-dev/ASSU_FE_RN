import "@testing-library/react-native/extend-expect";
import "react-native-gesture-handler/jestSetup";

jest.mock("react-native-reanimated", () =>
	require("react-native-reanimated/mock"),
);

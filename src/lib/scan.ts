import Constants from "expo-constants";
export async function scanDocuments(): Promise<string[]> {
  if (process.env.EXPO_OS !== "ios")
    throw new Error(
      "Document scanning is available in the iPhone development build. Use the sample invoice to preview this flow.",
    );
  if (Constants.executionEnvironment === "storeClient")
    throw new Error(
      "The native document scanner needs an Expo development build; it is not included in Expo Go.",
    );
  const scanner = await import("react-native-document-scanner-plugin");
  const result = await scanner.default.scanDocument({
    croppedImageQuality: 80,
    responseType: scanner.ResponseType.ImageFilePath,
  });
  return result.status === scanner.ScanDocumentResponseStatus.Cancel
    ? []
    : (result.scannedImages ?? []);
}

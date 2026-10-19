import Constants from "expo-constants";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
// Claude reads images natively up to a 2576 px long edge and downscales anything larger, so
// resizing here loses nothing it would use and keeps uploads small. One lossy pass at 0.9 keeps
// small print legible. https://platform.claude.com/docs/en/build-with-claude/vision
const MAX_EDGE = 2576;
async function fitForExtraction(uri: string) {
  const image = await ImageManipulator.manipulate(uri).renderAsync();
  if (Math.max(image.width, image.height) <= MAX_EDGE) return uri;
  const resized = await ImageManipulator.manipulate(uri)
    .resize(
      image.width >= image.height ? { width: MAX_EDGE } : { height: MAX_EDGE },
    )
    .renderAsync();
  return (await resized.saveAsync({ compress: 0.9, format: SaveFormat.JPEG }))
    .uri;
}
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
    croppedImageQuality: 95,
    responseType: scanner.ResponseType.ImageFilePath,
  });
  return result.status === scanner.ScanDocumentResponseStatus.Cancel
    ? []
    : Promise.all((result.scannedImages ?? []).map(fitForExtraction));
}

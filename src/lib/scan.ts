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
// Web: re-encode every photo as JPEG (iPhones may hand over HEIC) at most MAX_EDGE on its long edge.
async function fitForExtractionWeb(file: Blob) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(
      1,
      MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    canvas
      .getContext("2d")!
      .drawImage(image, 0, 0, canvas.width, canvas.height);
    const jpeg = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!jpeg) throw new Error("This photo couldn't be read. Try another.");
    return URL.createObjectURL(jpeg);
  } finally {
    URL.revokeObjectURL(url);
  }
}
// Web has no document scanner: the file picker offers Take Photo or the photo library on iPhone.
function pickPhotos() {
  return new Promise<File[]>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = () => resolve(Array.from(input.files ?? []));
    input.oncancel = () => resolve([]);
    input.click();
  });
}
export async function scanDocuments(): Promise<string[]> {
  if (process.env.EXPO_OS === "web")
    return Promise.all((await pickPhotos()).map(fitForExtractionWeb));
  if (process.env.EXPO_OS !== "ios")
    throw new Error(
      "Document scanning is available on iPhone and on the web. Use the sample invoice to preview this flow.",
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

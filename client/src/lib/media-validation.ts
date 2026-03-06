export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const VIDEO_MAX_SIZE = 20 * 1024 * 1024;
const IMAGE_MAX_SIZE = 1 * 1024 * 1024;
const VIDEO_ALLOWED_TYPES = ["video/mp4"];
const IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_ASPECT_RATIO = 16 / 9;
const IMAGE_ASPECT_RATIOS = [1, 4 / 3];
const RATIO_TOLERANCE = 0.05;

export function validatePromoVideoFile(file: File): ValidationResult {
  if (!VIDEO_ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "Dozwolony format: MP4 (H.264)" };
  }
  if (file.size > VIDEO_MAX_SIZE) {
    return { valid: false, error: `Maksymalny rozmiar wideo: ${VIDEO_MAX_SIZE / 1024 / 1024}MB` };
  }
  return { valid: true };
}

export function validatePromoVideoMeta(
  width: number,
  height: number
): ValidationResult {
  if (width > 1920 || height > 1080) {
    return { valid: false, error: "Maksymalna rozdzielczość: 1920x1080" };
  }
  const ratio = width / height;
  if (Math.abs(ratio - VIDEO_ASPECT_RATIO) > RATIO_TOLERANCE) {
    return { valid: false, error: "Wymagany format wideo: 16:9" };
  }
  return { valid: true };
}

export function validatePromoImageFile(file: File): ValidationResult {
  if (!IMAGE_ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "Dozwolony format: JPG, PNG lub WebP" };
  }
  if (file.size > IMAGE_MAX_SIZE) {
    return { valid: false, error: `Maksymalny rozmiar obrazu: ${IMAGE_MAX_SIZE / 1024 / 1024}MB` };
  }
  return { valid: true };
}

export function validatePromoImageMeta(
  width: number,
  height: number
): ValidationResult {
  const ratio = width / height;
  const matchesRatio = IMAGE_ASPECT_RATIOS.some(
    (ar) => Math.abs(ratio - ar) < RATIO_TOLERANCE
  );
  if (!matchesRatio) {
    return { valid: false, error: "Wymagany format obrazu: 1:1 lub 4:3" };
  }
  return { valid: true };
}

export function getVideoMeta(
  file: File
): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const url = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Nie można odczytać metadanych wideo"));
    };
    video.src = url;
  });
}

export function getImageMeta(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Nie można odczytać metadanych obrazu"));
    };
    img.src = url;
  });
}

export async function validatePromoVideo(file: File): Promise<ValidationResult> {
  const fileCheck = validatePromoVideoFile(file);
  if (!fileCheck.valid) return fileCheck;

  try {
    const meta = await getVideoMeta(file);
    return validatePromoVideoMeta(meta.width, meta.height);
  } catch (e: any) {
    return { valid: false, error: e.message || "Błąd walidacji wideo" };
  }
}

export async function validatePromoImage(file: File): Promise<ValidationResult> {
  const fileCheck = validatePromoImageFile(file);
  if (!fileCheck.valid) return fileCheck;

  try {
    const meta = await getImageMeta(file);
    return validatePromoImageMeta(meta.width, meta.height);
  } catch (e: any) {
    return { valid: false, error: e.message || "Błąd walidacji obrazu" };
  }
}

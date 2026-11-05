// Las fotos del celular suelen superar el límite del backend (5 MB): se
// achican y se pasan a JPEG, lo que también resuelve el HEIC de iPhone
const MAX_SIZE = 800;
const JPEG_QUALITY = 0.85;

export async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIZE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('No se pudo procesar la imagen');
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('No se pudo procesar la imagen')),
      'image/jpeg',
      JPEG_QUALITY,
    ),
  );
}

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

export type ImageExt = 'jpg' | 'png' | 'webp';

/** Sniffs the first bytes of a file to identify its real image type, ignoring any (attacker-controlled) Content-Type header. */
export function sniffImageType(head: Uint8Array): { ext: ImageExt; contentType: string } | null {
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return { ext: 'jpg', contentType: 'image/jpeg' };
  }
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) {
    return { ext: 'png', contentType: 'image/png' };
  }
  if (
    head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46
    && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50
  ) {
    return { ext: 'webp', contentType: 'image/webp' };
  }
  return null;
}

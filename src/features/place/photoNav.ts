/** Clamp photo-gallery navigation to valid bounds (no wrap-around). */
export function nextPhotoPage(page: number, length: number, delta: number): number {
  if (length <= 0) return 0;
  const cur = Math.min(Math.max(0, page), length - 1);
  return Math.min(length - 1, Math.max(0, cur + delta));
}

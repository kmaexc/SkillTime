export function getAvatarUrl(seed: string) {
  // DiceBear Micah or Bottts style works well for cute, lively avatars
  return `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc`;
}

const CUSTOM_MASK_IMAGES = ['/custom-mask-male.png', '/custom-mask-female.png'] as const;

export function randomCustomMaskImage(): (typeof CUSTOM_MASK_IMAGES)[number] {
  return CUSTOM_MASK_IMAGES[Math.random() < 0.5 ? 0 : 1];
}

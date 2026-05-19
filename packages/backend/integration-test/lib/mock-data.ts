import type { GigaB2BCrawlResult } from './pipeline-types';

const MOCK_PRODUCT: GigaB2BCrawlResult = {
  source: 'mock-data',
  url: 'https://www.gigab2b.com/mock-product-page',
  title: 'Adjustable Height Laptop Table Bed Tray Foldable Portable Standing Desk for Sofa Couch Bed Reading Writing',
  price: '$25.99 - $35.99',
  description:
    'Multifunctional adjustable laptop table suitable for bed, sofa, couch. Features adjustable height and angle, built-in cup holder, mouse pad, and tablet slot. Foldable design for easy storage.',
  images: [
    'https://m.media-amazon.com/images/I/615DOoCI6xL._SX466_.jpg',
  ],
  specifications: {
    'Material': 'Engineered Wood + Steel',
    'Size': '60cm x 40cm / 23.6" x 15.7"',
    'Adjustable Height': '23.5cm - 48cm / 9.3" - 18.9"',
    'Weight Capacity': '30kg / 66 lbs',
    'Color': 'Black / Walnut / Bamboo',
    'Foldable': 'Yes',
  },
};

export function getMockProductData(): GigaB2BCrawlResult {
  return { ...MOCK_PRODUCT };
}

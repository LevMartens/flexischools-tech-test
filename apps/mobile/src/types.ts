export type ProductCategory = 'Hot Food' | 'Sandwiches & Wraps' | 'Snacks' | 'Drinks';

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  /** Price in cents, to avoid floating point rounding on money. */
  priceCents: number;
  isAvailable: boolean;
};

export type OrderLine = {
  product: Product;
  quantity: number;
};

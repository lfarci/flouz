import type { Category } from '@/types'

export const CATEGORIES: Category[] = [
  // Root
  { id: '2e8f2f3a-7f9b-4c36-9a4b-3f5a7c1d0b91', name: 'Necessities',     slug: 'necessities',      parentId: null },
  { id: '9b5b1c88-4e2a-4a2b-9a2c-7a9b1f2c3d4e', name: 'Savings',         slug: 'savings',          parentId: null },
  { id: 'e7c4a2b1-1f3d-4d9a-8b7c-2a1f5c6d7e8f', name: 'Discretionary',   slug: 'discretionary',    parentId: null },

  // L2 under Necessities
  { id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d', name: 'House',           slug: 'house',            parentId: '2e8f2f3a-7f9b-4c36-9a4b-3f5a7c1d0b91' },
  { id: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e', name: 'Utilities',       slug: 'utilities',        parentId: '2e8f2f3a-7f9b-4c36-9a4b-3f5a7c1d0b91' },
  { id: '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f', name: 'Groceries',       slug: 'groceries',        parentId: '2e8f2f3a-7f9b-4c36-9a4b-3f5a7c1d0b91' },
  { id: '4d5e6f7a-8b9c-4d0e-1f2a-3b4c5d6e7f8a', name: 'Transport',       slug: 'transport',        parentId: '2e8f2f3a-7f9b-4c36-9a4b-3f5a7c1d0b91' },
  { id: '5e6f7a8b-9c0d-4e1f-2a3b-4c5d6e7f8a9b', name: 'Health',          slug: 'health',           parentId: '2e8f2f3a-7f9b-4c36-9a4b-3f5a7c1d0b91' },
  { id: '6f7a8b9c-0d1e-4f2a-3b4c-5d6e7f8a9b0c', name: 'Insurance',       slug: 'insurance',        parentId: '2e8f2f3a-7f9b-4c36-9a4b-3f5a7c1d0b91' },
  { id: '7a8b9c0d-1e2f-4a3b-4c5d-6e7f8a9b0c1d', name: 'Fees & Taxes',    slug: 'fees-and-taxes',   parentId: '2e8f2f3a-7f9b-4c36-9a4b-3f5a7c1d0b91' },
  { id: '8b9c0d1e-2f3a-4b4c-5d6e-7f8a9b0c1d2e', name: 'Cash & ATM',      slug: 'cash-and-atm',     parentId: '2e8f2f3a-7f9b-4c36-9a4b-3f5a7c1d0b91' },

  // L2 under Savings
  { id: '9c0d1e2f-3a4b-4c5d-6e7f-8a9b0c1d2e3f', name: 'Savings',         slug: 'savings-account',  parentId: '9b5b1c88-4e2a-4a2b-9a2c-7a9b1f2c3d4e' },
  { id: 'a0b1c2d3-4e5f-4a6b-7c8d-9e0f1a2b3c4d', name: 'Investments',     slug: 'investments',      parentId: '9b5b1c88-4e2a-4a2b-9a2c-7a9b1f2c3d4e' },

  // L2 under Discretionary
  { id: 'c2d3e4f5-6a7b-4c8d-9e0f-1a2b3c4d5e6f', name: 'Food & Drink',    slug: 'food-and-drink',   parentId: 'e7c4a2b1-1f3d-4d9a-8b7c-2a1f5c6d7e8f' },
  { id: 'd3e4f5a6-7b8c-4d9e-0f1a-2b3c4d5e6f7a', name: 'Shopping',        slug: 'shopping',         parentId: 'e7c4a2b1-1f3d-4d9a-8b7c-2a1f5c6d7e8f' },
  { id: 'e4f5a6b7-8c9d-4e0f-1a2b-3c4d5e6f7a8b', name: 'Entertainment',   slug: 'entertainment',    parentId: 'e7c4a2b1-1f3d-4d9a-8b7c-2a1f5c6d7e8f' },
  { id: 'f5a6b7c8-9d0e-4f1a-2b3c-4d5e6f7a8b9c', name: 'Travel',          slug: 'travel',           parentId: 'e7c4a2b1-1f3d-4d9a-8b7c-2a1f5c6d7e8f' },
  { id: '0a1b2c3d-4e5f-4a6b-7c8d-9e0f1a2b3c4d', name: 'Gifts & Charity', slug: 'gifts-and-charity', parentId: 'e7c4a2b1-1f3d-4d9a-8b7c-2a1f5c6d7e8f' },
  { id: '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e', name: 'Subscriptions',   slug: 'subscriptions',    parentId: 'e7c4a2b1-1f3d-4d9a-8b7c-2a1f5c6d7e8f' },

  // L3 under Transport
  { id: '6a7b8c9d-0e1f-4a2b-3c4d-5e6f7a8b9c0d', name: 'Public Transport', slug: 'public-transport', parentId: '4d5e6f7a-8b9c-4d0e-1f2a-3b4c5d6e7f8a' },
  { id: '7b8c9d0e-1f2a-4b3c-4d5e-6f7a8b9c0d1e', name: 'Parking',          slug: 'parking',          parentId: '4d5e6f7a-8b9c-4d0e-1f2a-3b4c5d6e7f8a' },
  { id: '8c9d0e1f-2a3b-4c4d-5e6f-7a8b9c0d1e2f', name: 'Car',              slug: 'car',              parentId: '4d5e6f7a-8b9c-4d0e-1f2a-3b4c5d6e7f8a' },
  { id: '9d0e1f2a-3b4c-4d5e-6f7a-8b9c0d1e2f3a', name: 'Bicycle',          slug: 'bicycle',          parentId: '4d5e6f7a-8b9c-4d0e-1f2a-3b4c5d6e7f8a' },

  // L3 under Utilities
  { id: '3d4e5f6a-7b8c-4d9e-0f1a-2b3c4d5e6f7a', name: 'Energy',          slug: 'energy',           parentId: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e' },
  { id: '4e5f6a7b-8c9d-4e0f-1a2b-3c4d5e6f7a8b', name: 'Utilities',       slug: 'utilities-sub',    parentId: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e' },
  { id: '5f6a7b8c-9d0e-4f1a-2b3c-4d5e6f7a8b9c', name: 'Communications',  slug: 'communications',   parentId: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e' },

  // L3 under Food & Drink
  { id: '2a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6d', name: 'Fast Food',       slug: 'fast-food',        parentId: 'c2d3e4f5-6a7b-4c8d-9e0f-1a2b3c4d5e6f' },
  { id: 'aa4d7e6a-4b7d-4c5b-9b6a-3f2c1d0e9a8b', name: 'Bar',             slug: 'bar',              parentId: 'c2d3e4f5-6a7b-4c8d-9e0f-1a2b3c4d5e6f' },
]

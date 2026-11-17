import type { CatalogItem } from '../types';
import { apiRequest } from './http';

export const catalogService = {
  list: () => apiRequest<CatalogItem[]>('/catalog'),
};

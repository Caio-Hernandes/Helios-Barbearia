import type { Request, Response } from 'express';
import { catalogService } from './catalog.service';
import type {
  CreateCatalogInput,
  ListCatalogQuery,
  CatalogIdParams,
  UpdateCatalogInput,
} from './catalog.schemas';

export const catalogController = {
  async list(req: Request, res: Response) {
    const { includeInactive } = req.query as unknown as ListCatalogQuery;
    res.json(await catalogService.list(req.user, includeInactive));
  },

  async create(req: Request, res: Response) {
    res.status(201).json(await catalogService.create(req.body as CreateCatalogInput));
  },

  async update(req: Request, res: Response) {
    const { catalogId } = req.params as CatalogIdParams;
    res.json(await catalogService.update(catalogId, req.body as UpdateCatalogInput));
  },
};

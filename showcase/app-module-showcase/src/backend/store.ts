// In-memory data of the equipment-loan demo. Fictional, reset on every start; nothing here is a real business rule.
export interface Asset {
  id: string;
  name: string;
  category: string;
  status: 'available' | 'loaned' | 'maintenance';
  quantity: number;
  tags: string[];
  purchasedAt: string;
  // Optimistic locking: bumped on every write, a save must carry the version it was based on.
  version: number;
}

export const STATUSES: Asset['status'][] = ['available', 'loaned', 'maintenance'];

const SEED: Omit<Asset, 'id' | 'version'>[] = [
  { name: 'Projector X200', category: 'audio-video', status: 'available', quantity: 2, tags: ['room-b'], purchasedAt: '2024-03-12' },
  { name: 'Laptop Pro 14', category: 'computing', status: 'loaned', quantity: 8, tags: ['pool', 'windows'], purchasedAt: '2025-01-20' },
  { name: 'Camera Mark IV', category: 'audio-video', status: 'maintenance', quantity: 1, tags: ['fragile'], purchasedAt: '2023-09-02' },
  { name: 'Tripod T-Light', category: 'accessories', status: 'available', quantity: 5, tags: [], purchasedAt: '2022-11-30' },
  { name: 'Label Printer', category: 'office', status: 'available', quantity: 1, tags: ['shared'], purchasedAt: '2024-07-04' },
  { name: 'Conference Speaker', category: 'audio-video', status: 'loaned', quantity: 3, tags: ['room-a'], purchasedAt: '2025-05-18' },
  { name: 'Tablet 10', category: 'computing', status: 'available', quantity: 6, tags: ['pool'], purchasedAt: '2025-02-09' },
  { name: 'HDMI Cable 5m', category: 'accessories', status: 'available', quantity: 20, tags: [], purchasedAt: '2021-06-15' },
];

export interface AssetInput {
  name?: unknown;
  category?: unknown;
  status?: unknown;
  quantity?: unknown;
  tags?: unknown;
  purchasedAt?: unknown;
  version?: unknown;
}

export class StoreError extends Error {
  constructor(
    readonly httpStatus: number,
    message: string
  ) {
    super(message);
  }
}

export class AssetStore {
  private assets = new Map<string, Asset>();
  private nextId = 1;

  constructor() {
    for (const seed of SEED) {
      this.insert(seed);
    }
  }

  private insert(fields: Omit<Asset, 'id' | 'version'>): Asset {
    const asset: Asset = { ...fields, id: `a${this.nextId++}`, version: 1 };
    this.assets.set(asset.id, asset);
    return asset;
  }

  list(query: { search?: string; status?: string }): Asset[] {
    const search = query.search?.trim().toLowerCase();
    return [...this.assets.values()].filter(
      a => (!search || a.name.toLowerCase().includes(search)) && (!query.status || a.status === query.status)
    );
  }

  get(id: string): Asset {
    const asset = this.assets.get(id);
    if (!asset) {
      throw new StoreError(404, `No asset "${id}". GET /api/modules/showcase/assets lists the ids.`);
    }
    return asset;
  }

  create(input: AssetInput): Asset {
    return this.insert(validate(input));
  }

  /** Saves over the version the caller read; a stale or missing version is refused with 409 or 422. */
  update(id: string, input: AssetInput): Asset {
    const current = this.get(id);
    if (typeof input.version !== 'number') {
      throw new StoreError(422, 'The request carries no "version": send the version of the asset you edited, so a concurrent change is detected.');
    }
    if (input.version !== current.version) {
      throw new StoreError(
        409,
        `Asset "${current.name}" changed since you opened it (you edited version ${input.version}, the current one is ${current.version}). Reload it, then re-apply your change.`
      );
    }
    const next: Asset = { ...current, ...validate({ ...current, ...input }), id, version: current.version + 1 };
    this.assets.set(id, next);
    return next;
  }

  remove(id: string): void {
    this.get(id);
    this.assets.delete(id);
  }

  /** Stands for "someone else saved": bumps the version without changing the data. */
  touch(id: string): Asset {
    const current = this.get(id);
    const next = { ...current, version: current.version + 1 };
    this.assets.set(id, next);
    return next;
  }
}

function validate(input: AssetInput): Omit<Asset, 'id' | 'version'> {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (name.length < 3) {
    throw new StoreError(422, 'The name must have at least 3 characters.');
  }
  const quantity = typeof input.quantity === 'string' && input.quantity.trim() !== '' ? Number(input.quantity) : input.quantity;
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 0) {
    throw new StoreError(422, 'The quantity must be a whole number, 0 or more.');
  }
  const status = input.status ?? 'available';
  if (!STATUSES.includes(status as Asset['status'])) {
    throw new StoreError(422, `The status must be one of: ${STATUSES.join(', ')}.`);
  }
  const category = typeof input.category === 'string' && input.category.trim() !== '' ? input.category.trim() : 'other';
  const tags = Array.isArray(input.tags) ? input.tags.filter((t): t is string => typeof t === 'string') : [];
  const purchasedAt = typeof input.purchasedAt === 'string' ? input.purchasedAt : '';
  return { name, category, status: status as Asset['status'], quantity, tags, purchasedAt };
}

// Backend entry (fixed path). Routes of the equipment-loan demo, mounted at /api/modules/showcase/.
import type { ModuleContext } from '@wadeck-app/app-core-sdk';
import { AssetStore, StoreError, type AssetInput } from './store.js';

interface Reply {
  code(status: number): Reply;
  send(body: unknown): unknown;
}

export default function setup(ctx: ModuleContext): void {
  // Reset on every load: the demo data is disposable.
  const store = new AssetStore();

  // A store refusal becomes its HTTP status and a message the page shows as is; anything else is a bug and rethrown.
  function guarded(reply: Reply, run: () => unknown): unknown {
    try {
      return reply.send(run());
    } catch (error) {
      if (error instanceof StoreError) {
        return reply.code(error.httpStatus).send({ error: error.message });
      }
      throw error;
    }
  }

  ctx.registerRoute('GET', '/ping', (_req, reply) => reply.send({ ok: true, at: new Date().toISOString() }));

  ctx.registerRoute('GET', '/assets', (req, reply) => {
    const query = (req.query ?? {}) as { search?: string; status?: string };
    return reply.send({ items: store.list(query) });
  });
  ctx.registerRoute('GET', '/assets/:id', (req, reply) => guarded(reply as Reply, () => store.get(req.params.id)));
  ctx.registerRoute('POST', '/assets', (req, reply) => guarded(reply as Reply, () => store.create((req.body ?? {}) as AssetInput)));
  ctx.registerRoute('PATCH', '/assets/:id', (req, reply) =>
    guarded(reply as Reply, () => store.update(req.params.id, (req.body ?? {}) as AssetInput))
  );
  ctx.registerRoute('DELETE', '/assets/:id', (req, reply) =>
    guarded(reply as Reply, () => {
      store.remove(req.params.id);
      return { ok: true };
    })
  );
  // "Someone else saved": makes the next save of an open edit page fail with 409, so the conflict is reproducible.
  ctx.registerRoute('POST', '/assets/:id/touch', (req, reply) => guarded(reply as Reply, () => store.touch(req.params.id)));
}

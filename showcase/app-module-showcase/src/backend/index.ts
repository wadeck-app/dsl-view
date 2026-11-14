// Backend entry (fixed path). Routes of the equipment-loan demo, mounted at /api/modules/showcase/.
import type { ModuleContext } from '@wadeck-app/app-core-sdk';
import { AssetStore, ReservationStore, StoreError, type AssetInput, type ReservationInput } from './store.js';

interface Reply {
  code(status: number): Reply;
  send(body: unknown): unknown;
}

export default function setup(ctx: ModuleContext): void {
  // Reset on every load: the demo data is disposable.
  const store = new AssetStore();
  const reservations = new ReservationStore(store);

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

  // Routes that fail on demand, to show how errors reach the user (toasts, source errors) and a slow one for loading states.
  const FAILURES: Record<string, { status: number; error: string }> = {
    short: { status: 500, error: 'Something went wrong.' },
    long: {
      status: 503,
      error:
        'Could not load the data: the machine daemon is not running (no C:\\Users\\someone\\.config\\machine\\daemon.port.json): start it with `machine daemon` and retry. If it keeps failing, check the log of the service.',
    },
    word: { status: 502, error: `Upstream refused the request: ${'x'.repeat(100)}` },
  };
  ctx.registerRoute('POST', '/fail/:kind', (req, reply) => {
    const failure = FAILURES[req.params.kind];
    if (!failure) {
      return reply.code(404).send({ error: `Unknown failure "${req.params.kind}". Known: ${Object.keys(FAILURES).join(', ')}.` });
    }
    return reply.code(failure.status).send({ error: failure.error });
  });
  ctx.registerRoute('GET', '/fail/:kind', (req, reply) => {
    const failure = FAILURES[req.params.kind];
    return reply.code(failure?.status ?? 404).send({ error: failure?.error ?? 'Unknown failure.' });
  });
  ctx.registerRoute('GET', '/slow', async (_req, reply) => {
    await new Promise(resolve => setTimeout(resolve, 3000));
    return reply.send({ done: true });
  });

  // Options of the asset select of the reservation form, in the { value, label } shape the select reads.
  ctx.registerRoute('GET', '/asset-options', (_req, reply) =>
    reply.send({ items: store.list({}).map(a => ({ value: a.id, label: a.name })) })
  );
  ctx.registerRoute('GET', '/reservations', (_req, reply) => reply.send({ items: reservations.list() }));
  ctx.registerRoute('POST', '/reservations', (req, reply) =>
    guarded(reply as Reply, () => reservations.create((req.body ?? {}) as ReservationInput))
  );
  ctx.registerRoute('DELETE', '/reservations/:id', (req, reply) =>
    guarded(reply as Reply, () => {
      reservations.remove(req.params.id);
      return { ok: true };
    })
  );

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

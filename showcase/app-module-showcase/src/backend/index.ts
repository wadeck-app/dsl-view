// Spike backend: one route, to prove a view can read this module's data. The fake business data comes in a later phase.
import type { ModuleContext } from '@wadeck-app/app-core-sdk';

export default function setup(ctx: ModuleContext): void {
  ctx.registerRoute('GET', '/ping', (_req, reply) => reply.send({ ok: true, at: new Date().toISOString() }));
}

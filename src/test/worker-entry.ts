// Minimal worker entry point for vitest-pool-workers tests.
// This is NOT deployed — it exists solely to satisfy the workers pool
// requirement for a main entry point. Route-handler tests import their
// handlers directly; they do not go through this fetch handler.
export default {
  async fetch(): Promise<Response> {
    return new Response("ok");
  },
};

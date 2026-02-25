export function ok(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function badRequest(message: string, details?: unknown) {
  return Response.json({ ok: false, error: message, details }, { status: 400 });
}

export function notFound(message: string) {
  return Response.json({ ok: false, error: message }, { status: 404 });
}

export function serverError(message: string, details?: unknown) {
  console.error(message, details);
  return Response.json({ ok: false, error: message, details }, { status: 500 });
}

export function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function handleError(error: unknown, context: string): Response {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[${context}] Error:`, message)
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  })
}

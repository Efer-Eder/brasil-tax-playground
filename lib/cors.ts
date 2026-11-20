/**
 * CORS aberto para a API pública: não há cookies nem autenticação, então
 * qualquer origem pode chamar (o rate limit fica no proxy e no app).
 */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "600",
};

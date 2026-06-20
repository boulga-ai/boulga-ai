// Les appels API passent toujours par le proxy Next.js (/backend → backend réel).
// Cela évite les problèmes de tunnel en Codespace et les erreurs CORS en production.
export const API_URL = "/backend";

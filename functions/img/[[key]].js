// GET /img/<key> → painting photo from KV. Keys are unique per upload, so cache forever.
export async function onRequestGet({ env, params }) {
  const key = (params.key || []).join('/');
  if (!/^p\d+\/[\w-]+\.(jpg|webp|png)$/.test(key)) return new Response('Not found', { status: 404 });
  const { value, metadata } = await env.IMAGES.getWithMetadata(key, { type: 'stream', cacheTtl: 86400 });
  if (!value) return new Response('Not found', { status: 404 });
  return new Response(value, {
    headers: {
      'content-type': metadata?.type || 'image/jpeg',
      'cache-control': 'public, max-age=31536000, immutable'
    }
  });
}

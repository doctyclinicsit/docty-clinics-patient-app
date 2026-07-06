const EKA_PUBLIC_BASE_URL = 'https://www.eka.care';

export default async function handler(request: any, response: any) {
  const upstreamPath = Array.isArray(request.query?.path)
    ? request.query.path[0]
    : request.query?.path;

  if (!upstreamPath?.startsWith('/')) {
    return response.status(400).json({ message: 'A valid upstream path is required.' });
  }

  const upstreamResponse = await fetch(`${EKA_PUBLIC_BASE_URL}${upstreamPath}`, {
    headers: {
      Accept: request.headers.accept || 'text/html',
    },
  });

  const contentType = upstreamResponse.headers.get('content-type');
  if (contentType) response.setHeader('Content-Type', contentType);
  response.setHeader('Cache-Control', 'public, s-maxage=3600');
  return response.status(upstreamResponse.status).send(
    Buffer.from(await upstreamResponse.arrayBuffer())
  );
}

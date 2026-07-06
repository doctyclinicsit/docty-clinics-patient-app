const EKA_API_BASE_URL = 'https://api.eka.care';

export default async function handler(request: any, response: any) {
  const token = process.env.EKA_AUTH_TOKEN;
  const clientId = process.env.EKA_CLIENT_ID;

  if (!token) {
    return response.status(500).json({ message: 'EKA_AUTH_TOKEN is not configured.' });
  }

  const upstreamPath = Array.isArray(request.query?.path)
    ? request.query.path[0]
    : request.query?.path;

  if (!upstreamPath?.startsWith('/')) {
    return response.status(400).json({ message: 'A valid upstream path is required.' });
  }

  const upstreamUrl = new URL(`${EKA_API_BASE_URL}${upstreamPath}`);
  const isProfilesApi = upstreamPath.startsWith('/profiles/');
  const headers = new Headers();
  headers.set('Accept', request.headers.accept || 'application/json');

  if (request.headers['content-type']) {
    headers.set('Content-Type', request.headers['content-type']);
  }

  if (isProfilesApi) {
    headers.set('Authorization', `Bearer ${token}`);
    if (clientId) headers.set('client-id', clientId);
  } else {
    headers.set('auth', token);
  }

  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : JSON.stringify(request.body),
  });

  const contentType = upstreamResponse.headers.get('content-type');
  if (contentType) response.setHeader('Content-Type', contentType);
  response.setHeader('Cache-Control', 'no-store');
  return response.status(upstreamResponse.status).send(
    Buffer.from(await upstreamResponse.arrayBuffer())
  );
}

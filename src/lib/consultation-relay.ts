export async function relay(path: string, init?: RequestInit) {
  const [resourcePath, query = ''] = path.split('?');
  const resource = resourcePath.replace(/^\//, '');
  const url = `/api/consultation-relay?resource=${encodeURIComponent(resource)}${query ? `&${query}` : ''}`;
  let nextInit = init;
  if (init?.body && typeof init.body === 'string') {
    const body = JSON.parse(init.body);
    nextInit = { ...init, body: JSON.stringify({ ...body, resource }) };
  }
  const response = await fetch(url, nextInit);
  if (!response.ok) throw new Error('Consultation relay is unavailable.');
  const value = await response.json();
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...value, deviceId: value.deviceId || value.device_id, deviceName: value.deviceName || value.device_name };
  }
  return value;
}

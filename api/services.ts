const EKA_API_BASE_URL = 'https://api.eka.care';

async function ekaRequest(path: string, token: string) {
  const response = await fetch(`${EKA_API_BASE_URL}${path}`, {
    headers: {
      auth: token,
      Accept: 'application/json',
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || body?.error || response.statusText);
  }

  return body;
}

export default async function handler(_request: any, response: any) {
  const token = process.env.EKA_AUTH_TOKEN;

  if (!token) {
    return response.status(500).json({ message: 'EKA_AUTH_TOKEN is not configured.' });
  }

  try {
    const entitiesResponse = await ekaRequest('/dr/v1/business/entities', token);
    const entities = entitiesResponse.data || entitiesResponse;
    const doctors = Array.isArray(entities.doctors) ? entities.doctors : [];
    const servicesByName = new Map<string, any>();
    const batchSize = 8;

    for (let index = 0; index < doctors.length; index += batchSize) {
      const batch = doctors.slice(index, index + batchSize);
      const results = await Promise.allSettled(
        batch.map((doctor: any) =>
          ekaRequest(`/dr/v1/doctor/service/${doctor.doctor_id}`, token)
        )
      );

      results.forEach((result) => {
        if (result.status !== 'fulfilled') return;

        const services = result.value?.data?.services;
        const serviceList = Array.isArray(services) ? services : services ? [services] : [];

        serviceList.forEach((service: any) => {
          if (service.archive) return;
          const normalizedName = String(service.service_name || '')
            .trim()
            .toLowerCase()
            .replace(/&/g, 'and')
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (!normalizedName || servicesByName.has(normalizedName)) return;
          servicesByName.set(normalizedName, service);
        });
      });
    }

    response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return response.status(200).json({ services: [...servicesByName.values()] });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to load Eka services.',
    });
  }
}

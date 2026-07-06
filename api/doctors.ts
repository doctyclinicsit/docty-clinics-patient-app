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

export default async function handler(request: any, response: any) {
  const token = process.env.EKA_AUTH_TOKEN;

  if (!token) {
    return response.status(500).json({ message: 'EKA_AUTH_TOKEN is not configured.' });
  }

  try {
    const requestedTop = Number(request.query?.top);
    const top = Number.isFinite(requestedTop) && requestedTop > 0
      ? Math.min(requestedTop, 30)
      : 30;
    const entitiesResponse = await ekaRequest('/dr/v1/business/entities', token);
    const entities = entitiesResponse.data || entitiesResponse;
    const summaries = (Array.isArray(entities.doctors) ? entities.doctors : []).slice(0, top);
    const doctors = [];
    const batchSize = 6;

    for (let index = 0; index < summaries.length; index += batchSize) {
      const batch = summaries.slice(index, index + batchSize);
      const results = await Promise.all(
        batch.map(async (summary: any) => {
          const [profileResult, servicesResult] = await Promise.allSettled([
            ekaRequest(`/dr/v1/doctor/${summary.doctor_id}`, token),
            ekaRequest(`/dr/v1/doctor/service/${summary.doctor_id}`, token),
          ]);

          return {
            summary,
            profile: profileResult.status === 'fulfilled' ? profileResult.value : null,
            services: servicesResult.status === 'fulfilled'
              ? servicesResult.value?.data?.services
              : [],
          };
        })
      );

      doctors.push(...results);
    }

    response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return response.status(200).json({ doctors });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to load Eka doctors.',
    });
  }
}


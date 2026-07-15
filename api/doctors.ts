import {
  doctorsFromSnapshot,
  fetchEkaDoctorSnapshot,
  isFreshDoctorSnapshot,
  parseDoctorTop,
  readDoctorSnapshot,
  writeDoctorSnapshot,
} from './_lib/doctor-cache.js';

export default async function handler(request: any, response: any) {
  const token = process.env.EKA_AUTH_TOKEN;

  if (!token) {
    return response.status(500).json({ message: 'EKA_AUTH_TOKEN is not configured.' });
  }

  const requestedTop = parseDoctorTop(request.query?.top);

  try {
    const cachedSnapshot = await readDoctorSnapshot();

    if (isFreshDoctorSnapshot(cachedSnapshot)) {
      response.setHeader('Cache-Control', 'public, s-maxage=7200, stale-while-revalidate=86400');
      response.setHeader('X-Doctors-Source', 'blob-cache');
      return response.status(200).json({
        doctors: doctorsFromSnapshot(cachedSnapshot, requestedTop),
        syncedAt: cachedSnapshot.syncedAt,
        source: 'cache',
      });
    }

    const freshSnapshot = await fetchEkaDoctorSnapshot(token);
    await writeDoctorSnapshot(freshSnapshot).catch(() => undefined);

    response.setHeader('Cache-Control', 'public, s-maxage=7200, stale-while-revalidate=86400');
    response.setHeader('X-Doctors-Source', 'eka-refresh');
    return response.status(200).json({
      doctors: doctorsFromSnapshot(freshSnapshot, requestedTop),
      syncedAt: freshSnapshot.syncedAt,
      source: 'eka',
    });
  } catch (error) {
    const staleSnapshot = await readDoctorSnapshot();
    if (staleSnapshot?.doctors?.length) {
      response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
      response.setHeader('X-Doctors-Source', 'stale-blob-cache');
      response.setHeader('Warning', '110 - "Serving stale doctors snapshot because Eka refresh failed"');
      return response.status(200).json({
        doctors: doctorsFromSnapshot(staleSnapshot, requestedTop),
        syncedAt: staleSnapshot.syncedAt,
        source: 'stale-cache',
      });
    }

    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to load Eka doctors.',
    });
  }
}

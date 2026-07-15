import {
  fetchLabTestsSnapshot,
  filterLabTests,
  isFreshLabTestsSnapshot,
  labTestsFallbackResponse,
  readLabTestsSnapshot,
  writeLabTestsSnapshot,
} from './_lib/lab-tests-cache.js';

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  try {
    const cachedSnapshot = await readLabTestsSnapshot();

    if (isFreshLabTestsSnapshot(cachedSnapshot)) {
      response.setHeader('Cache-Control', 'public, s-maxage=7200, stale-while-revalidate=86400');
      response.setHeader('X-Lab-Tests-Source', 'blob-cache');
      return response.status(200).json({
        tests: filterLabTests(cachedSnapshot.tests, request),
        categories: cachedSnapshot.categories,
        syncedAt: cachedSnapshot.syncedAt,
        source: 'cache',
      });
    }

    const freshSnapshot = await fetchLabTestsSnapshot();
    await writeLabTestsSnapshot(freshSnapshot).catch(() => undefined);

    response.setHeader('Cache-Control', 'public, s-maxage=7200, stale-while-revalidate=86400');
    response.setHeader('X-Lab-Tests-Source', freshSnapshot.source === 'neon' ? 'neon-refresh' : 'fallback-refresh');
    return response.status(200).json({
      tests: filterLabTests(freshSnapshot.tests, request),
      categories: freshSnapshot.categories,
      syncedAt: freshSnapshot.syncedAt,
      source: freshSnapshot.source,
    });
  } catch (error) {
    const staleSnapshot = await readLabTestsSnapshot();
    if (staleSnapshot?.tests?.length) {
      response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
      response.setHeader('X-Lab-Tests-Source', 'stale-blob-cache');
      response.setHeader('Warning', '110 - "Serving stale lab tests snapshot because refresh failed"');
      return response.status(200).json({
        tests: filterLabTests(staleSnapshot.tests, request),
        categories: staleSnapshot.categories,
        syncedAt: staleSnapshot.syncedAt,
        source: 'stale-cache',
      });
    }

    response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    response.setHeader('X-Lab-Tests-Source', 'fallback-error');
    return response.status(200).json(labTestsFallbackResponse(request, 'fallback-error', error));
  }
}

import { readAdminStaffSession } from '../../server/staff-admin.js';
import {
  generateFranchiseOpportunityShareCode,
  readFranchiseOpportunityScenario,
  saveFranchiseOpportunityScenario,
} from '../../server/franchise-opportunity-store.js';

const FRANCHISE_OPPORTUNITY_SHARE_TOKEN =
  process.env.FRANCHISE_OPPORTUNITY_SHARE_TOKEN || 'dcty-franchise-2026-8a4f9a20f1b047a9960d20e1';

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export default async function handler(request: any, response: any) {
  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const adminSession = readAdminStaffSession(request.headers.cookie);
  const shareToken = text(request.query?.shareToken);
  const shareCode = text(request.query?.shareCode);
  const locationId = text(request.query?.locationId) || text(request.query?.location);
  const hasShareToken = shareToken && shareToken === FRANCHISE_OPPORTUNITY_SHARE_TOKEN;

  const isAdmin = adminSession.status === 200;

  if (!isAdmin && request.method === 'POST') {
    return response.status(401).json({ message: 'Please sign in as an admin staff member.' });
  }

  if (!isAdmin && !hasShareToken) {
    return response.status(401).json({ message: 'Please sign in as an admin staff member.' });
  }

  try {
    const adminSessionRecord = adminSession.status === 200 ? (adminSession as any).session : undefined;
    const adminActor = adminSessionRecord?.name || adminSessionRecord?.mobile || '';
    const scenario = request.method === 'POST'
      ? request.body?.action === 'share'
        ? await generateFranchiseOpportunityShareCode(adminActor)
        : await saveFranchiseOpportunityScenario(
            request.body?.locations,
            adminActor,
            request.body?.showBenchmark !== false
          )
      : await readFranchiseOpportunityScenario();
    const hasShareAccess = hasShareToken && shareCode === scenario.shareCode;

    if (!isAdmin && !hasShareAccess) {
      return response.status(403).json({ message: 'Please enter the 6-digit franchise opportunity access code.' });
    }

    const responseScenario = { ...scenario };

    if (!isAdmin) {
      const selectedLocation = locationId
        ? scenario.locations.find((location: any) => location.id === locationId)
        : scenario.locations[0];
      if (!selectedLocation) {
        return response.status(404).json({ message: 'This franchise opportunity location was not found.' });
      }
      responseScenario.locations = [selectedLocation];
    }

    response.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return response.status(200).json({
      ...responseScenario,
      shareToken: FRANCHISE_OPPORTUNITY_SHARE_TOKEN,
      shareCode: isAdmin ? scenario.shareCode : undefined,
      shareCodeExpiresAt: isAdmin ? scenario.shareCodeExpiresAt : undefined,
      source: {
        baseline: 'Manikonda historical footfall, revenue, and OPEX baseline',
        projection: 'Conservative 5-year ramp with expected operational break-even around month 18 and mature revenue plateau',
        rules: 'FOCO pitch rules: 50% owner capex, 50% Docty capex, franchise fee, WCSD, monthly management fee, and post-month-18 waiver logic',
      },
    });
  } catch (error) {
    return response.status(500).json({
      message: error instanceof Error ? error.message : 'Franchise opportunity storage is temporarily unavailable.',
    });
  }
}

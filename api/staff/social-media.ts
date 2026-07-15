import { readStaffSession, staffSessionSecret } from '../../server/staff-session.js';
import { hasStaffModuleAccess } from '../../server/staff-access.js';
import {
  addSocialComment,
  createSocialItem,
  generateContentDraft,
  getSocialWorkspace,
  retryPublish,
  rescheduleSocialItem,
  submitSocialContentForReview,
  reviewSocialContent,
} from '../../server/social-media-store.js';

type ModuleRole = 'admin' | 'content_creator' | 'clinical_reviewer' | 'management_approver' | 'publisher' | 'viewer';

function moduleRole(session: any): ModuleRole {
  if (session.isAdmin) return 'admin';
  const role = String(session.staffRole || '').toLowerCase();
  if (/doctor|clinical/.test(role)) return 'clinical_reviewer';
  if (/management|manager|executive/.test(role)) return 'management_approver';
  if (/publish/.test(role)) return 'publisher';
  if (/marketing|content|social|designer/.test(role)) return 'content_creator';
  return 'viewer';
}

function can(role: ModuleRole, action: string) {
  if (role === 'admin') return true;
  if (action === 'view') return true;
  if (action === 'create' || action === 'comment' || action === 'content_review') return role === 'content_creator';
  if (action === 'clinical_review') return role === 'clinical_reviewer';
  if (action === 'management_review') return role === 'management_approver';
  if (action === 'publish_retry') return role === 'publisher';
  return false;
}

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  if (process.env.SOCIAL_MEDIA_ENABLED === 'false') return response.status(404).json({ message: 'Social Media Management is disabled.' });
  const secret = staffSessionSecret();
  const session = secret ? readStaffSession(request.headers.cookie, secret) : undefined;
  if (!session) return response.status(401).json({ message: 'Please sign in as staff.' });
  if (!(await hasStaffModuleAccess(session, 'social_media'))) return response.status(403).json({ message: 'Social Media access has not been assigned to this staff account.' });
  const role = moduleRole(session);
  const actor = { ...session, staffRole: role };

  try {
    if (request.method === 'GET') {
      const workspace = await getSocialWorkspace({ location: request.query?.location, status: request.query?.status });
      return response.status(200).json({ ...workspace, currentUser: { name: session.name || '', mobile: session.mobile, role, permissions: { create: can(role,'create'), contentReview: can(role,'content_review'), clinicalReview: can(role,'clinical_review'), managementReview: can(role,'management_review'), publish: can(role,'publish_retry') } } });
    }

    if (request.method === 'POST') {
      const action = String(request.body?.action || '');
      if (action === 'generate') {
        if (!can(role, 'create')) return response.status(403).json({ message: 'Content Creator access is required.' });
        return response.status(200).json({ draft: generateContentDraft(request.body || {}) });
      }
      if (action === 'create') {
        if (!can(role, 'create')) return response.status(403).json({ message: 'Content Creator access is required.' });
        if (!request.body?.scheduledFor || !['Manikonda','Lanco Hills','Combined'].includes(request.body?.location)) return response.status(400).json({ message: 'A valid date and location are required.' });
        return response.status(201).json({ item: await createSocialItem(request.body, actor) });
      }
      if (action === 'comment') {
        if (!can(role, 'comment')) return response.status(403).json({ message: 'Comment access is required.' });
        const body = String(request.body?.body || '').trim();
        if (!request.body?.contentId || !body) return response.status(400).json({ message: 'Content item and comment are required.' });
        return response.status(201).json({ comment: await addSocialComment(String(request.body.contentId), body, actor) });
      }
      if (action === 'reschedule') {
        if (!can(role, 'create')) return response.status(403).json({ message: 'Content Creator access is required.' });
        if (!request.body?.contentId || !/^\d{4}-\d{2}-\d{2}$/.test(String(request.body?.scheduledFor || ''))) return response.status(400).json({ message: 'A valid content item and date are required.' });
        return response.status(200).json({ item: await rescheduleSocialItem(String(request.body.contentId), String(request.body.scheduledFor), actor) });
      }
      if (action === 'submit_review') {
        if (!can(role, 'create')) return response.status(403).json({ message: 'Content Creator access is required.' });
        return response.status(200).json({ item: await submitSocialContentForReview(String(request.body?.contentId || ''), actor) });
      }
      if (action === 'review') {
        const stage = String(request.body?.stage || '');
        if (!can(role, `${stage}_review`)) return response.status(403).json({ message: `You are not authorised for ${stage} review.` });
        const item = await reviewSocialContent(String(request.body?.contentId || ''), stage, String(request.body?.decision || ''), String(request.body?.note || ''), actor);
        return response.status(200).json({ item });
      }
      if (action === 'retry_publish') {
        if (!can(role, 'publish_retry')) return response.status(403).json({ message: 'Publisher access is required.' });
        return response.status(200).json(await retryPublish(String(request.body?.contentId || ''), actor));
      }
      return response.status(400).json({ message: 'Unknown social media action.' });
    }

    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  } catch (error) {
    return response.status(500).json({ message: error instanceof Error ? error.message : 'Unable to process social media request.' });
  }
}

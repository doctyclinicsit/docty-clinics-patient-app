import { get, put } from '@vercel/blob';
import { readStaffSession, staffSessionSecret } from '../../server/staff-session.js';

const MAX_IMAGE_LENGTH = 400_000;
const SUPPORTED_IMAGE_PATTERN = /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i;

export default async function handler(request: any, response: any) {
  if (!['GET', 'PATCH'].includes(request.method)) {
    response.setHeader('Allow', 'GET, PATCH');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = staffSessionSecret();
  const staffSession = secret ? readStaffSession(request.headers.cookie, secret) : undefined;
  if (!staffSession) return response.status(401).json({ message: 'Please sign in as staff.' });

  const ekaToken = process.env.EKA_AUTH_TOKEN;
  const ekaClientId = process.env.EKA_CLIENT_ID;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!ekaToken || !blobToken) {
    return response.status(500).json({ message: 'Patient photo service is not configured.' });
  }

  const patientId = String(request.method === 'GET' ? request.query?.patientId : request.body?.patientId || '');
  if (!patientId) {
    return response.status(400).json({ message: 'Patient ID is required.' });
  }

  const headers = {
    Authorization: `Bearer ${ekaToken}`,
    ...(ekaClientId ? { 'client-id': ekaClientId } : {}),
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const profileUrl = `https://api.eka.care/profiles/v1/patient/${encodeURIComponent(patientId)}`;

  try {
    const profileResponse = await fetch(profileUrl, { headers });
    const profile = await profileResponse.json().catch(() => null);
    if (!profileResponse.ok) {
      return response.status(profileResponse.status).json({
        message:
          profile?.message ||
          profile?.error?.message ||
          'Unable to retrieve the patient profile.',
      });
    }

    if (request.method === 'GET') {
      const pathname = String(profile?.extras?.doctyPic || '');
      if (!pathname || pathname.startsWith('data:')) {
        return response.status(404).send('Profile picture not found.');
      }

      if (pathname.startsWith('http')) {
        return response.redirect(302, pathname);
      }

      const blob = await get(pathname, {
        access: 'private',
        token: blobToken,
      });
      if (!blob || blob.statusCode !== 200) {
        return response.status(404).send('Profile picture not found.');
      }

      const bytes = await new Response(blob.stream).arrayBuffer();
      response.setHeader('Content-Type', blob.blob.contentType || 'image/jpeg');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('Cache-Control', 'private, no-store');
      return response.status(200).send(Buffer.from(bytes));
    }

    const imageUrl = String(request.body?.imageUrl || '');
    if (
      !imageUrl ||
      imageUrl.length > MAX_IMAGE_LENGTH ||
      !SUPPORTED_IMAGE_PATTERN.test(imageUrl)
    ) {
      return response.status(400).json({
        message: 'Upload a JPG, PNG, or WebP profile picture smaller than 300 KB.',
      });
    }

    const base64 = imageUrl.slice(imageUrl.indexOf(',') + 1);
    const imageBuffer = Buffer.from(base64, 'base64');
    const pathname = `patient-profile/${patientId}.jpg`;
    await put(pathname, imageBuffer, {
      access: 'private',
      contentType: 'image/jpeg',
      addRandomSuffix: false,
      allowOverwrite: true,
      token: blobToken,
    });

    const updateResponse = await fetch(profileUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        extras: {
          ...(profile?.extras || {}),
          doctyPic: pathname,
        },
      }),
    });
    const body = await updateResponse.json().catch(() => null);
    if (!updateResponse.ok) {
      return response.status(updateResponse.status).json({
        message:
          body?.message ||
          body?.error?.message ||
          'Unable to update the profile picture.',
      });
    }

    return response.status(200).json({
      imageUrl: `/api/staff/patient-photo?patientId=${encodeURIComponent(patientId)}&v=${Date.now()}`,
    });
  } catch {
    return response.status(502).json({ message: 'Patient photo service is temporarily unavailable.' });
  }
}

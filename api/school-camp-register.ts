function normalizeName(value: unknown) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeMobile(value: unknown) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

function ageToDob(value: unknown) {
  const ageMatch = String(value || '').match(/\d+/);
  const age = ageMatch ? Number(ageMatch[0]) : 8;
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - Math.min(Math.max(age, 1), 18));
  return date.toISOString().slice(0, 10);
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const ekaToken = process.env.EKA_AUTH_TOKEN;
  const ekaClientId = process.env.EKA_CLIENT_ID;
  if (!ekaToken) {
    return response.status(500).json({ message: 'Eka patient registration is not configured.' });
  }

  const childName = normalizeName(request.body?.childName);
  const parentName = normalizeName(request.body?.parentName);
  const mobile = normalizeMobile(request.body?.mobile);
  const grade = String(request.body?.grade || '').trim();
  const section = String(request.body?.section || '').trim();
  const group = String(request.body?.group || '').trim();
  const gender = String(request.body?.gender || 'O').toUpperCase();

  if (childName.length < 2) {
    return response.status(400).json({ message: 'Enter the child name.' });
  }

  if (!/^\d{10}$/.test(mobile)) {
    return response.status(400).json({ message: 'Enter a valid parent mobile number.' });
  }

  if (!['M', 'F', 'O'].includes(gender)) {
    return response.status(400).json({ message: 'Select a valid gender.' });
  }

  const [firstName, ...lastNameParts] = childName.split(' ');
  const lastName = lastNameParts.join(' ');

  try {
    const ekaResponse = await fetch('https://api.eka.care/profiles/v1/patient/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ekaToken}`,
        ...(ekaClientId ? { 'client-id': ekaClientId } : {}),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fn: firstName,
        ...(lastName ? { ln: lastName } : {}),
        dob: ageToDob(request.body?.age),
        gen: gender,
        mobile: `+91${mobile}`,
        username: `SC${Date.now()}`,
        extras: {
          source: 'school-camp',
          school: 'Sri Gayatri Techno School',
          parentName,
          grade,
          section,
          group,
        },
      }),
    });

    const body = await ekaResponse.json().catch(() => null);
    const patientId = body?.oid || body?.data?.oid || body?.patient_id;

    if (!ekaResponse.ok || !patientId) {
      return response.status(ekaResponse.ok ? 502 : ekaResponse.status).json({
        message:
          body?.message ||
          body?.error?.message ||
          body?.error ||
          'Unable to register the student in Eka.',
      });
    }

    response.setHeader('Cache-Control', 'no-store');
    return response.status(201).json({
      profile: {
        id: String(patientId),
        name: childName,
        mobile,
        source: 'school-camp',
      },
    });
  } catch {
    return response.status(502).json({ message: 'Eka patient registration is temporarily unavailable.' });
  }
}

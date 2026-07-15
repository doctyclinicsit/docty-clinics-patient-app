import { listEkaStaffUsers, normalizeIndianMobile } from '../../../server/eka-staff.js';
import { readStaffSession, staffSessionSecret } from '../../../server/staff-session.js';
import { STAFF_MODULES, configuredAdminMobile, getStaffModuleAccess, listStoredAccess, readStaffAdminSession, saveStaffModuleAccess } from '../../../server/staff-access.js';

function requireSessions(request:any) {
  const secret = staffSessionSecret();
  const staff = secret ? readStaffSession(request.headers.cookie, secret) : undefined;
  const admin = secret ? readStaffAdminSession(request.headers.cookie, secret) : undefined;
  return { secret, staff, admin };
}

export default async function handler(request:any, response:any) {
  response.setHeader('Cache-Control','private, no-store, max-age=0');
  const { staff, admin } = requireSessions(request);
  if (!staff) return response.status(401).json({ message:'Please sign in as staff first.' });
  if (!admin) return response.status(403).json({ message:'A fresh administration OTP is required.' });

  try {
    if (request.method === 'GET') {
      let directory:any[] = [];
      let directoryWarning = '';
      try { directory = await listEkaStaffUsers(); }
      catch (error) { directoryWarning = error instanceof Error ? error.message : 'Eka staff directory is unavailable.'; }
      const stored = await listStoredAccess();
      const mobiles = new Set<string>([configuredAdminMobile(), ...directory.map((user)=>normalizeIndianMobile(user.mobile)), ...stored.map((row:any)=>normalizeIndianMobile(row.staff_mobile))].filter(Boolean));
      const users = await Promise.all(Array.from(mobiles).map(async (mobile)=>{
        const person = directory.find((user)=>normalizeIndianMobile(user.mobile)===mobile);
        return { mobile, name:person?.name || (mobile===configuredAdminMobile()?'Super Admin':''), role:person?.role || '', assignedClinics:person?.assignedClinics || [], access:await getStaffModuleAccess({mobile,isAdmin:mobile===configuredAdminMobile()}) };
      }));
      users.sort((a,b)=>(a.name || a.mobile).localeCompare(b.name || b.mobile));
      return response.status(200).json({ modules:STAFF_MODULES, users, directoryWarning, adminSessionExpiresAt:admin.expiresAt });
    }
    if (request.method === 'POST') {
      const staffMobile = normalizeIndianMobile(request.body?.staffMobile);
      if (!staffMobile) return response.status(400).json({ message:'Choose a valid staff user.' });
      const access = await saveStaffModuleAccess({ staffMobile, access:request.body?.access || {} }, staff);
      return response.status(200).json({ staffMobile, access });
    }
    response.setHeader('Allow','GET, POST');
    return response.status(405).json({ message:'Method not allowed.' });
  } catch (error) {
    return response.status(500).json({ message:error instanceof Error ? error.message : 'Unable to manage staff access.' });
  }
}

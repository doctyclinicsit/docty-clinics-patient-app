export interface EkaStaffUser {
  id?: string;
  name?: string;
  mobile: string;
  role?: string;
  assignedClinics?: Array<{ id: string; name: string }>;
}

export const SUPER_ADMIN_MOBILE = '9063145621';

export function normalizeIndianMobile(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(digits) ? digits : '';
}

function firstString(...values: unknown[]) {
  return values.find((value) => typeof value === 'string' && value.trim())
    ? String(values.find((value) => typeof value === 'string' && value.trim())).trim()
    : '';
}

function collectObjects(value: unknown, collected: any[] = []) {
  if (!value || typeof value !== 'object') return collected;
  if (Array.isArray(value)) {
    value.forEach((item) => collectObjects(item, collected));
    return collected;
  }

  collected.push(value);
  Object.values(value).forEach((item) => {
    if (item && typeof item === 'object') collectObjects(item, collected);
  });
  return collected;
}

function normalizeStaffUser(value: any): EkaStaffUser | undefined {
  const mobile = normalizeIndianMobile(
    value.mobile ||
      value.mob ||
      value.phone ||
      value.phone_number ||
      value.phoneNumber ||
      value.contact ||
      value.contact_number ||
      value.contactNumber ||
      value.user_mobile ||
      value.userMobile
  );
  if (!mobile) return undefined;

  const clinicSources = [
    value.clinics,
    value.assigned_clinics,
    value.assignedClinics,
    value.clinic,
    value.facilities,
    value.business_entities,
    value.entities,
  ].flatMap((item) => (Array.isArray(item) ? item : item ? [item] : []));
  const assignedClinics = clinicSources
    .map((clinic: any) => ({
      id: firstString(clinic.id, clinic.clinic_id, clinic.clinicId, clinic.entity_id, clinic.entityId),
      name: firstString(clinic.name, clinic.clinic_name, clinic.clinicName, clinic.entity_name, clinic.entityName),
    }))
    .filter((clinic) => clinic.id || clinic.name)
    .map((clinic) => ({
      id: clinic.id || clinic.name,
      name: clinic.name || clinic.id,
    }));

  return {
    id: firstString(value.id, value.oid, value.uuid, value.user_id, value.userId),
    name: firstString(
      value.name,
      value.fln,
      value.full_name,
      value.fullName,
      value.username,
      value.user_name,
      value.userName
    ),
    mobile,
    role: firstString(value.role, value.user_role, value.userRole, value.type),
    assignedClinics,
  };
}

export async function listEkaStaffUsers() {
  const ekaToken = process.env.EKA_AUTH_TOKEN;
  const ekaClientId = process.env.EKA_CLIENT_ID;
  if (!ekaToken || !ekaClientId) {
    throw new Error('Eka staff directory is not configured.');
  }

  const ekaResponse = await fetch('https://api.eka.care/cdr/v1/hipusers/', {
    headers: {
      Authorization: `Bearer ${ekaToken}`,
      'client-id': ekaClientId,
      Accept: 'application/json',
    },
  });
  const body = await ekaResponse.json().catch(() => null);
  if (!ekaResponse.ok) {
    throw new Error(
      body?.message ||
        body?.error?.message ||
        body?.error ||
        'Unable to retrieve staff users from Eka.'
    );
  }

  const possibleUsers =
    body?.users ||
    body?.data?.users ||
    body?.data?.hipusers ||
    body?.data?.hip_users ||
    body?.hipusers ||
    body?.hip_users ||
    body?.data ||
    body;
  const users = collectObjects(possibleUsers)
    .map(normalizeStaffUser)
    .filter(Boolean) as EkaStaffUser[];
  const uniqueUsers = new Map<string, EkaStaffUser>();
  users.forEach((user) => {
    if (!uniqueUsers.has(user.mobile)) uniqueUsers.set(user.mobile, user);
  });
  return Array.from(uniqueUsers.values());
}

export async function findEkaStaffUserByMobile(mobile: string) {
  const normalizedMobile = normalizeIndianMobile(mobile);
  if (!normalizedMobile) return undefined;
  const users = await listEkaStaffUsers();
  return users.find((user) => user.mobile === normalizedMobile);
}

export function isEkaStaffAdmin(user: Pick<EkaStaffUser, 'mobile' | 'role'> | undefined) {
  if (!user) return false;
  if (normalizeIndianMobile(user.mobile) === SUPER_ADMIN_MOBILE) return true;
  return /\b(admin|owner|super\s*admin|administrator)\b/i.test(String(user.role || ''));
}

export function isEkaFranchiseOwner(user: Pick<EkaStaffUser, 'mobile' | 'role'> | undefined) {
  if (!user) return false;
  if (normalizeIndianMobile(user.mobile) === SUPER_ADMIN_MOBILE) return true;
  return /\b(franchise|owner|partner|admin|administrator)\b/i.test(String(user.role || ''));
}

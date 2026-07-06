export interface ZohoBooksExpenseTransaction {
  id: string;
  date: string;
  accountName: string;
  vendorName: string;
  customerName: string;
  description: string;
  referenceNumber: string;
  status: string;
  locationName: string;
  total: number;
  totalWithoutTax: number;
  currencyCode: string;
  expenseType: string;
  receiptName: string;
  raw: Record<string, unknown>;
}

export interface ZohoBooksItemRecord {
  itemId: string;
  name: string;
  sku: string;
  rate: number;
  purchaseRate: number;
  stockOnHand: number;
  status: string;
  raw: Record<string, unknown>;
}

export interface ZohoBooksInvoiceRecord {
  invoiceId: string;
  invoiceNumber: string;
  referenceNumber: string;
  status: string;
  total: number;
  raw: Record<string, unknown>;
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function numberValue(value: unknown) {
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function zohoAccountsDomain() {
  return (text(process.env.ZOHO_ACCOUNTS_DOMAIN) || 'https://accounts.zoho.in').replace(/\/+$/, '');
}

function zohoBooksApiDomain() {
  return (text(process.env.ZOHO_BOOKS_API_DOMAIN) || 'https://www.zohoapis.in').replace(/\/+$/, '');
}

function zohoBooksOrganizationId() {
  return text(process.env.ZOHO_BOOKS_ORGANIZATION_ID);
}

let cachedAccessToken = '';
let cachedAccessTokenExpiresAt = 0;

async function getZohoBooksAccessToken() {
  const refreshToken = text(process.env.ZOHO_BOOKS_REFRESH_TOKEN);
  const clientId = text(process.env.ZOHO_BOOKS_CLIENT_ID || process.env.ZOHO_CRM_CLIENT_ID);
  const clientSecret = text(process.env.ZOHO_BOOKS_CLIENT_SECRET || process.env.ZOHO_CRM_CLIENT_SECRET);

  if (refreshToken && clientId && clientSecret) {
    const now = Date.now();
    if (cachedAccessToken && cachedAccessTokenExpiresAt > now + 60_000) return cachedAccessToken;

    const params = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    });
    const response = await fetch(`${zohoAccountsDomain()}/oauth/v2/token`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: params,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.access_token) {
      throw new Error(body?.error || 'Unable to refresh Zoho Books access token.');
    }
    cachedAccessToken = text(body.access_token);
    cachedAccessTokenExpiresAt = now + Math.max(300, Number(body.expires_in || 3600) - 120) * 1000;
    return cachedAccessToken;
  }

  const token = text(process.env.ZOHO_BOOKS_ACCESS_TOKEN);
  if (!token) throw new Error('Zoho Books OAuth credentials are not configured.');
  return token;
}

async function parseZohoBooksResponse(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok || (body?.code !== undefined && Number(body.code) !== 0)) {
    throw new Error(body?.message || body?.code || 'Zoho Books request failed.');
  }
  return body;
}

export async function zohoBooksFetch(path: string, params?: URLSearchParams, init: RequestInit = {}) {
  const organizationId = zohoBooksOrganizationId();
  if (!organizationId) throw new Error('ZOHO_BOOKS_ORGANIZATION_ID is not configured.');

  const token = await getZohoBooksAccessToken();
  const query = params || new URLSearchParams();
  query.set('organization_id', organizationId);

  return parseZohoBooksResponse(
    await fetch(`${zohoBooksApiDomain()}/books/v3${path}?${query.toString()}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
        Authorization: `Zoho-oauthtoken ${token}`,
      },
    })
  );
}

function normalizeZohoBooksItem(record: Record<string, unknown>): ZohoBooksItemRecord {
  return {
    itemId: text(record.item_id) || text(record.id),
    name: text(record.name),
    sku: text(record.sku),
    rate: numberValue(record.rate),
    purchaseRate: numberValue(record.purchase_rate),
    stockOnHand: numberValue(record.stock_on_hand || record.available_stock || record.actual_available_stock),
    status: text(record.status),
    raw: record,
  };
}

export async function listZohoBooksItems({ maxPages = 20 }: { maxPages?: number } = {}) {
  const items: ZohoBooksItemRecord[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const query = new URLSearchParams({
      page: String(page),
      per_page: '200',
    });
    const body = await zohoBooksFetch('/items', query);
    const records = Array.isArray(body?.items) ? body.items : [];
    items.push(...records.map((record: Record<string, unknown>) => normalizeZohoBooksItem(record)));

    const pageContext = body?.page_context || {};
    if (!pageContext.has_more_page || records.length === 0) break;
  }

  return items;
}

export async function createZohoBooksItem(payload: Record<string, unknown>) {
  const body = await zohoBooksFetch('/items', undefined, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeZohoBooksItem((body?.item || body) as Record<string, unknown>);
}

export async function updateZohoBooksItem(itemId: string, payload: Record<string, unknown>) {
  const body = await zohoBooksFetch(`/items/${itemId}`, undefined, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return normalizeZohoBooksItem((body?.item || body) as Record<string, unknown>);
}

function normalizeZohoBooksInvoice(record: Record<string, unknown>): ZohoBooksInvoiceRecord {
  return {
    invoiceId: text(record.invoice_id) || text(record.id),
    invoiceNumber: text(record.invoice_number),
    referenceNumber: text(record.reference_number),
    status: text(record.status),
    total: numberValue(record.total),
    raw: record,
  };
}

export async function listZohoBooksInvoicesByReference(referenceNumber: string) {
  const query = new URLSearchParams({
    reference_number: referenceNumber,
    per_page: '20',
  });
  const body = await zohoBooksFetch('/invoices', query);
  const records = Array.isArray(body?.invoices) ? body.invoices : [];
  return records.map((record: Record<string, unknown>) => normalizeZohoBooksInvoice(record));
}

export async function createZohoBooksInvoice(payload: Record<string, unknown>) {
  const body = await zohoBooksFetch('/invoices', undefined, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeZohoBooksInvoice((body?.invoice || body) as Record<string, unknown>);
}

export function zohoBooksInventoryItemConfig() {
  const purchaseAccountId = text(process.env.ZOHO_BOOKS_PURCHASE_ACCOUNT_ID);
  const inventoryAccountId = text(process.env.ZOHO_BOOKS_INVENTORY_ACCOUNT_ID);
  const accountId = text(process.env.ZOHO_BOOKS_SALES_ACCOUNT_ID || process.env.ZOHO_BOOKS_ITEM_ACCOUNT_ID);
  const itemType = purchaseAccountId && inventoryAccountId ? 'inventory' : 'sales';

  return {
    itemType,
    accountId,
    purchaseAccountId,
    inventoryAccountId,
    sourceCustomFieldId: text(process.env.ZOHO_BOOKS_ITEM_SOURCE_CUSTOM_FIELD_ID),
  };
}

function normalizeZohoBooksExpense(record: Record<string, unknown>, index: number): ZohoBooksExpenseTransaction {
  return {
    id: text(record.expense_id) || text(record.transaction_id) || text(record.id) || `expense-${index}`,
    date: text(record.date),
    accountName: text(record.account_name) || 'Uncategorized',
    vendorName: text(record.vendor_name),
    customerName: text(record.customer_name),
    description: text(record.description),
    referenceNumber: text(record.reference_number),
    status: text(record.status) || 'unknown',
    locationName: text(record.location_name),
    total: numberValue(record.bcy_total || record.total || record.amount),
    totalWithoutTax: numberValue(record.bcy_total_without_tax || record.total_without_tax),
    currencyCode: text(record.currency_code) || 'INR',
    expenseType: text(record.expense_type),
    receiptName: text(record.expense_receipt_name),
    raw: record,
  };
}

export async function listZohoBooksExpenses({
  startDate,
  endDate,
  maxPages = 10,
}: {
  startDate?: string;
  endDate?: string;
  maxPages?: number;
}) {
  const expenses: ZohoBooksExpenseTransaction[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const query = new URLSearchParams({
      page: String(page),
      per_page: '200',
      sort_column: 'date',
    });
    if (startDate) query.set('date_start', startDate);
    if (endDate) query.set('date_end', endDate);

    const body = await zohoBooksFetch('/expenses', query);
    const records = Array.isArray(body?.expenses) ? body.expenses : [];
    expenses.push(...records.map((record: Record<string, unknown>, index: number) => normalizeZohoBooksExpense(record, expenses.length + index)));

    const pageContext = body?.page_context || {};
    if (!pageContext.has_more_page || records.length === 0) break;
  }

  return expenses;
}

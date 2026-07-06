function numericAmount(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  const number = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function getPathValue(source: any, path: string) {
  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) return undefined;
    return current[key];
  }, source);
}

function firstAmountFromPaths(source: any, paths: string[]) {
  for (const path of paths) {
    const amount = numericAmount(getPathValue(source, path));
    if (amount !== undefined && amount > 0) return { amount, source: path };
  }
  return undefined;
}

function collectObjects(source: unknown, objects: any[] = []) {
  if (!source || typeof source !== 'object') return objects;
  if (Array.isArray(source)) {
    source.forEach((item) => collectObjects(item, objects));
    return objects;
  }
  objects.push(source);
  Object.values(source).forEach((value) => collectObjects(value, objects));
  return objects;
}

function receiptArrayAmount(source: any) {
  const arrays = collectObjects(source).flatMap((object) =>
    Object.entries(object)
      .filter(([key, value]) => /receipt|bill|invoice/i.test(key) && Array.isArray(value))
      .flatMap(([, value]) => value as any[])
  );

  let total = 0;
  let matched = false;
  arrays.forEach((receipt) => {
    const status = String(receipt?.receipt_status || receipt?.status || '').toUpperCase();
    const isSuccessful = !status || status.includes('SUCCESS') || status.includes('PAID') || status === 'CM';
    const amount =
      numericAmount(receipt?.amount_paid) ??
      numericAmount(receipt?.receipt_amount) ??
      numericAmount(receipt?.net_amount);
    if (isSuccessful && amount !== undefined) {
      total += amount;
      matched = true;
    }
  });

  return matched && total > 0 ? { amount: total, source: 'receipt_array' } : undefined;
}

function recursivePaymentAmount(source: any) {
  const preferredKeys = [
    'amount_paid',
    'paid_amount',
    'payment_amount',
    'receipt_amount',
    'net_amount',
    'total_paid',
    'amount',
  ];

  for (const object of collectObjects(source)) {
    const keys = Object.keys(object);
    const looksLikePayment =
      keys.some((key) => /payment|receipt|paid|transaction|bill|invoice/i.test(key)) ||
      ['payment_gateway', 'payment_mode', 'payment_status', 'receipt_status'].some((key) => key in object);
    if (!looksLikePayment) continue;

    for (const key of preferredKeys) {
      const amount = numericAmount(object[key]);
      if (amount !== undefined && amount > 0) {
        return { amount, source: `recursive.${key}` };
      }
    }
  }

  return undefined;
}

function findTransactionId(source: any) {
  const candidateKeys = ['transaction_id', 'payment_id', 'ref_trx_id'];
  for (const object of collectObjects(source)) {
    for (const key of candidateKeys) {
      const value = String(object[key] || '').trim();
      if (value) return value;
    }
  }
  return undefined;
}

async function transactionStatusAmount(source: any, ekaToken: string) {
  const transactionId = findTransactionId(source);
  if (!transactionId) return undefined;

  const transactionResponse = await fetch(
    `https://api.eka.care/dr/v1/payment/transaction_status/${encodeURIComponent(transactionId)}`,
    { headers: { auth: ekaToken, Accept: 'application/json' } }
  );
  const body = await transactionResponse.json().catch(() => null);
  if (!transactionResponse.ok) return undefined;

  const status = String(body?.payment_status || '').toUpperCase();
  const amount = numericAmount(body?.amount);
  return amount !== undefined && amount > 0 && (!status || status.includes('SUCCESS') || status.includes('PAID'))
    ? { amount, source: 'transaction_status' }
    : undefined;
}

export async function resolveAppointmentPaymentAmount(appointment: any, ekaToken: string) {
  const directAmount = firstAmountFromPaths(appointment, [
    'payment.amount',
    'payment.amount_paid',
    'payment.paid_amount',
    'payment.payment_amount',
    'receipt.receipt_amount',
    'receipt.net_amount',
    'receipt.amount_paid',
    'amount_paid',
    'receipt_amount',
    'net_amount',
    'payment_amount',
    'service.price',
    'appointment_details.service.price',
    'details.service.price',
  ]);
  if (directAmount) return directAmount;

  const receiptTotal = receiptArrayAmount(appointment);
  if (receiptTotal) return receiptTotal;

  const recursiveAmount = recursivePaymentAmount(appointment);
  if (recursiveAmount) return recursiveAmount;

  const transactionAmount = await transactionStatusAmount(appointment, ekaToken);
  if (transactionAmount) return transactionAmount;

  return { amount: 0, source: 'not_found' };
}

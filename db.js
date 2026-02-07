export const db = {
  vendors: [],
  invoices: [],
  payments: []
};

function norm(s) {
  return (s || "").trim().toLowerCase();
}

export function findVendorByName(name) {
  const n = norm(name);
  return db.vendors.find(v => v.name_norm === n);
}

export function getOrCreateVendor(name) {
  const existing = findVendorByName(name);
  if (existing) return existing;

  const vendor = {
    vendor_id: `v_${Math.random().toString(16).slice(2, 10)}`,
    name: (name || "").trim(),
    name_norm: norm(name),

    // learned baselines from PAID invoices
    knownTaxIds: [],
    knownIbans: [],

    // simplest amount baseline (hackathon-friendly)
    typicalMin: null,
    typicalMax: null,

    // optional metadata
    updated_at: new Date().toISOString()
  };

  db.vendors.push(vendor);
  return vendor;
}

export function updateVendorBaselineFromPaidInvoice(vendor, invoice) {
  // Learn Tax ID
  const tax = (invoice.tax_id || "").trim();
  if (tax && !vendor.knownTaxIds.includes(tax)) vendor.knownTaxIds.push(tax);

  // Learn IBAN
  const iban = (invoice.iban || "").trim();
  if (iban && !vendor.knownIbans.includes(iban)) vendor.knownIbans.push(iban);

  // Learn amount range
  const amt = Number(invoice.amount_total || 0);
  if (Number.isFinite(amt) && amt > 0) {
    if (vendor.typicalMin === null || amt < vendor.typicalMin) vendor.typicalMin = amt;
    if (vendor.typicalMax === null || amt > vendor.typicalMax) vendor.typicalMax = amt;
  }

  vendor.updated_at = new Date().toISOString();
}

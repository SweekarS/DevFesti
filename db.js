// In-memory storage for hackathon speed.
// Swap for SQLite later if you want.

export const db = {
  vendors: [],
  invoices: []
};

export function findVendorByName(name) {
  const n = (name || "").trim().toLowerCase();
  return db.vendors.find(v => (v.name || "").trim().toLowerCase() === n);
}

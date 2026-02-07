const http = require('http');

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: data
        ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        : {}
    };
    const req = http.request(opts, res => {
      let b = '';
      res.on('data', c => (b += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b || '{}') }); }
        catch (e) { resolve({ status: res.statusCode, body: b }); }
      });
    });
    req.on('error', e => reject(e));
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  try {
    console.log('1) POST invoice A (will be marked PAID)');
    const invoiceA = {
      vendor_name: 'Acme Test Co',
      invoice_number: 'INV-100',
      invoice_date: new Date().toISOString().slice(0,10),
      amount_total: 100,
      tax_id: 'TAX-111',
      iban: 'IBAN-111'
    };
    const r1 = await request('POST','/invoices', invoiceA);
    console.log('Response:', r1);
    const invId = r1.body.invoice_id;

    console.log('\n2) POST /payments to mark invoice A as paid');
    const pay = { invoice_id: invId };
    const r2 = await request('POST','/payments', pay);
    console.log('Response:', r2);

    console.log('\n3) GET /vendors to inspect learned baselines');
    const r3 = await request('GET','/vendors');
    console.log('Response:', r3);

    console.log('\n4) POST invoice B with different IBAN to check IBAN_MISMATCH');
    const invoiceB = { ...invoiceA, invoice_number: 'INV-101', iban: 'IBAN-222' };
    const r4 = await request('POST','/invoices', invoiceB);
    console.log('Response:', r4);

    console.log('\n5) POST invoice C with same invoice_number as paid (INV-100) to check ALREADY_PAID');
    const invoiceC = { ...invoiceA, invoice_number: 'INV-100' };
    const r5 = await request('POST','/invoices', invoiceC);
    console.log('Response:', r5);

  } catch (e) {
    console.error('Test error:', e.message || e);
  }
})();

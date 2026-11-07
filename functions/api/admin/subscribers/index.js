// GET /api/admin/subscribers            → JSON list, newest first
// GET /api/admin/subscribers?format=csv → spreadsheet download
import { json } from '../../../../lib/util.js';

function csvCell(v) {
  const s = String(v ?? '');
  // Leading =,+,-,@ would run as a formula in Excel; prefix with a quote.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function onRequestGet({ request, env }) {
  const { results } = await env.DB
    .prepare('SELECT id, email, name, source, created_at FROM subscribers ORDER BY created_at DESC, id DESC').all();
  if (new URL(request.url).searchParams.get('format') === 'csv') {
    const lines = [['Email', 'Name', 'Signed up', 'Where'].join(',')]
      .concat(results.map(r => [r.email, r.name, r.created_at, r.source].map(csvCell).join(',')));
    const day = new Date().toISOString().slice(0, 10);
    return new Response('﻿' + lines.join('\r\n'), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="tanya-subscribers-${day}.csv"`,
        'cache-control': 'no-store'
      }
    });
  }
  return json({ subscribers: results });
}

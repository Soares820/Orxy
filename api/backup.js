const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

// Callable manually via POST /api/backup, or by Vercel Cron (GET) if configured
// in vercel.json — NOT currently scheduled there. Auth is required on every
// method: this reads every table with the service-role key (bypasses RLS),
// so it must never be reachable without BACKUP_SECRET, regardless of verb.
module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).end();
  }

  const expected = process.env.BACKUP_SECRET;
  if (!expected) {
    // Fail closed: an unset secret must never mean "no auth required".
    return res.status(500).json({ error: 'BACKUP_SECRET not configured' });
  }
  const secret = req.headers['x-backup-secret'] || req.body?.secret || req.query?.secret;
  if (secret !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const tables = ['clinics','users','pacientes','sessoes','avaliacoes','contratos','pagamentos','funcionarios','audit_logs'];
    const snapshot = {};
    const errors   = [];

    for (const tbl of tables) {
      const { data, error } = await supabase.from(tbl).select('*');
      if (error) { errors.push({ table: tbl, error: error.message }); }
      else        { snapshot[tbl] = data; }
    }

    // Store snapshot in audit_logs for traceability
    await supabase.from('audit_logs').insert({
      action:   'BACKUP_DIARIO',
      tabela:   'system',
      detalhes: JSON.stringify({
        timestamp:   new Date().toISOString(),
        tablesOk:    Object.keys(snapshot).length,
        tablesFailed: errors.length,
        totalRows:   Object.values(snapshot).reduce((s, rows) => s + rows.length, 0),
      }),
    });

    return res.status(200).json({
      ok:          true,
      timestamp:   new Date().toISOString(),
      tablesOk:    Object.keys(snapshot).length,
      tablesFailed: errors.length,
      errors,
      totalRows:   Object.values(snapshot).reduce((s, rows) => s + rows.length, 0),
    });
  } catch (err) {
    console.error('Backup error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

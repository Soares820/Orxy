// Roda com: node scripts/reset-password.js <email-ou-uid> <nova-senha>
// Precisa do .env.local com SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SUPABASE_URL

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const [, , identifier, novaSenha] = process.argv;

if (!URL || !KEY) { console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não encontradas no .env.local'); process.exit(1); }
if (!identifier || !novaSenha) { console.error('Uso: node scripts/reset-password.js <email-ou-uid> <nova-senha>'); process.exit(1); }
if (novaSenha.length < 8) { console.error('Nova senha deve ter pelo menos 8 caracteres'); process.exit(1); }

const admin = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  let uid = identifier;
  if (identifier.includes('@')) {
    const { data, error } = await admin.auth.admin.listUsers();
    if (error) { console.error('Erro ao listar usuários:', error.message); process.exit(1); }
    const found = data.users.find((u) => u.email?.toLowerCase() === identifier.toLowerCase());
    if (!found) { console.error('Usuário não encontrado:', identifier); process.exit(1); }
    uid = found.id;
  }

  const { data, error } = await admin.auth.admin.updateUserById(uid, { password: novaSenha });
  if (error) { console.error('Erro:', error.message); process.exit(1); }
  console.log('✅ Senha alterada para o usuário:', data.user.email);
}

main();

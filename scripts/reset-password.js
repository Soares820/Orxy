// Roda com: node scripts/reset-password.js
// Precisa do .env.local com SUPABASE_SERVICE_ROLE_KEY

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const URL  = 'https://ktnqsskvflqppujovvyi.supabase.co';
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const UID  = 'a3a60186-63d8-4395-9aff-682c7d324af8'; // arthur.cleber@hotmail.com
const NOVA_SENHA = 'Cleber@2026';

if (!KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY não encontrada no .env.local'); process.exit(1); }

const admin = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

admin.auth.admin.updateUserById(UID, { password: NOVA_SENHA })
  .then(({ data, error }) => {
    if (error) { console.error('Erro:', error.message); process.exit(1); }
    console.log('✅ Senha alterada para:', NOVA_SENHA);
    console.log('   Usuário:', data.user.email);
  });

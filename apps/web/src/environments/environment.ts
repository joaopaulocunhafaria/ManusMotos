// Produção — Dashboard Supabase > Project Settings > API.
// A publishable/anon key é pública por design; a segurança vem das policies de RLS.
// NUNCA coloque a service_role/secret key no front-end.
export const environment = {
	production: true,
	supabaseUrl: 'https://jirabjimylbuizgxxhcj.supabase.co/rest/v1/',
	supabaseKey: 'sb_publishable_I_PnQ54H-VIgVoAnLQzyLA_8jokyQnz',
};

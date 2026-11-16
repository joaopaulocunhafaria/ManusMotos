// Edge Function de exemplo: devolve o título da mecânica cadastrado em design_settings.
// Local:  npm run functions:serve  →  POST http://127.0.0.1:54321/functions/v1/hello
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}

	const json = (body: unknown, status = 200) =>
		new Response(JSON.stringify(body), {
			status,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});

	// Client com a chave pública → respeita RLS
	const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);

	const { data, error } = await supabase.from('design_settings').select('shop_name').eq('id', 1).single();

	if (error) return json({ error: error.message }, 400);
	return json({ message: `Olá, ${data.shop_name}!` });
});

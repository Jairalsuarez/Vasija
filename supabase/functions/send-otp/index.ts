import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { phone, code } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  if (code) {
    const { data: record, error: findError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .single();

    if (findError || !record) {
      return new Response(
        JSON.stringify({ success: false, error: 'Código inválido o expirado' }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    const now = Date.now();
    const createdAt = new Date(record.created_at).getTime();
    if (now - createdAt > 5 * 60 * 1000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Código expirado' }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    await supabase
      .from('verification_codes')
      .delete()
      .eq('id', record.id);

    return new Response(
      JSON.stringify({ success: true, message: 'Teléfono verificado' }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  await supabase
    .from('verification_codes')
    .insert({
      phone,
      code: verificationCode,
      created_at: new Date().toISOString(),
    });

  console.log(`[WhatsApp OTP] Código para ${phone}: ${verificationCode}`);

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Código enviado por WhatsApp',
      code: verificationCode,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});

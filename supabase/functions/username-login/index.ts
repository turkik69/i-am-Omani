import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  try {
    const { username, password } = await req.json()
    const cleanUsername = String(username || '').trim().toLowerCase()
    if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername) || String(password || '').length < 1) {
      return Response.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 400 })
    }

    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

    const { data: profile } = await admin
      .from('player_profiles')
      .select('user_id')
      .eq('username', cleanUsername)
      .maybeSingle()
    if (!profile?.user_id) return Response.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })

    const { data: userResult } = await admin.auth.admin.getUserById(profile.user_id)
    const email = userResult?.user?.email
    if (!email) return Response.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })

    const authClient = createClient(url, anonKey, { auth: { persistSession: false } })
    const { data, error } = await authClient.auth.signInWithPassword({ email, password })
    if (error || !data.session) return Response.json({ error: 'اسم المستخدم أو الرمز السري غير صحيح' }, { status: 401 })

    return Response.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
    })
  } catch {
    return Response.json({ error: 'تعذر تسجيل الدخول الآن' }, { status: 500 })
  }
})

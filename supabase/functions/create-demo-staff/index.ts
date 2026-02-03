import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const demoEmail = 'staff@demo.com';
    const demoPassword = 'demo1234';

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === demoEmail);

    let userId: string;

    if (existingUser) {
      // Update password if user exists
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: demoPassword,
      });
      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: demoEmail,
        password: demoPassword,
        email_confirm: true,
      });

      if (createError) throw createError;
      userId = newUser.user.id;
    }

    // Check if staff profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from('staff_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!existingProfile) {
      // Create staff profile with kitchen role
      const { error: profileError } = await supabaseAdmin
        .from('staff_profiles')
        .insert({
          user_id: userId,
          name: 'Demo Kitchen Staff',
          role: 'kitchen',
          is_active: true,
        });

      if (profileError) throw profileError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo staff account ready',
        credentials: {
          email: demoEmail,
          password: demoPassword,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating demo staff:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create demo staff',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

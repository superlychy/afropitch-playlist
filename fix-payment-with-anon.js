// Fix payment using anon key (limited permissions, but might work for admin_top_up_user)
const { createClient } = require('@supabase/supabase-js');

// Use the temp env file credentials
const supabase = createClient(
  'https://gildytqinnntmtvbagxm.supabase.co',
  'YOUR_SUPABASE_KEY'
);

async function fixPayment() {
  console.log('🔍 Finding user: admin@pressplaymusics.com');

  try {
    // Try to find the user
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'admin@pressplaymusics.com')
      .single();

    if (userError || !user) {
      console.error('❌ User not found:', userError?.message || 'No user found');
      console.log('   This might mean the user never registered, or the email is different.');
      return;
    }

    console.log('✅ Found user:', user.full_name || user.email);
    console.log('   Current balance:', user.balance);
    console.log('   User ID:', user.id);

    // Try to run admin_top_up_user
    console.log('\n⏳ Attempting to credit 8000...');
    const { data: result, error: topUpError } = await supabase.rpc('admin_top_up_user', {
      p_user_id: user.id,
      p_amount: 8000,
      p_description: 'Manual fix: Payment via Paystack (admin@pressplaymusics.com) - 2026-03-22'
    });

    if (topUpError) {
      console.error('❌ Top-up failed:', topUpError.message);
      console.log('   This might be a permissions issue with the anon key.');
      console.log('   You may need to use the service role key in Supabase SQL Editor.');
      return;
    }

    console.log('✅ Top-up result:', result);

    // Verify the new balance
    const { data: updatedUser } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single();

    console.log('\n✅ Payment credited successfully!');
    console.log('   New balance:', updatedUser.balance);
    console.log('   Previous balance:', user.balance);
    console.log('   Amount added:', 8000);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n💡 Tip: If anon key doesn\'t work, run the SQL in Supabase SQL Editor instead.');
  }
}

fixPayment();

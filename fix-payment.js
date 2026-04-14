// Fix script for uncredited payment to admin@pressplaymusics.com
// Run with: node fix-payment.js

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixPayment() {
  console.log('🔍 Finding user: admin@pressplaymusics.com');

  // Find the user
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'admin@pressplaymusics.com')
    .single();

  if (userError || !user) {
    console.error('❌ User not found:', userError?.message || 'No user found');
    return;
  }

  console.log('✅ Found user:', user.full_name || user.email);
  console.log('   Current balance:', user.balance);
  console.log('   User ID:', user.id);

  // Check existing transactions for this amount
  const { data: existingTxns, error: txnError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('amount', 8000)
    .eq('type', 'deposit')
    .limit(1);

  if (txnError) {
    console.error('❌ Error checking transactions:', txnError.message);
    return;
  }

  if (existingTxns && existingTxns.length > 0) {
    console.log('⚠️  Transaction already exists:');
    console.log('   Transaction ID:', existingTxns[0].id);
    console.log('   Amount:', existingTxns[0].amount);
    console.log('   Description:', existingTxns[0].description);
    console.log('   Created at:', existingTxns[0].created_at);
    console.log('   Current balance should be:', user.balance);
    return;
  }

  console.log('ℹ️  No 8000 deposit found for this user');
  console.log('   Attempting to credit 8000...');

  // Use the admin_top_up_user RPC function
  const { data: result, error: topUpError } = await supabase.rpc('admin_top_up_user', {
    p_user_id: user.id,
    p_amount: 8000,
    p_description: 'Manual fix: Payment via Paystack (admin@pressplaymusics.com) - ID from Paystack needed'
  });

  if (topUpError) {
    console.error('❌ Top-up failed:', topUpError.message);
    return;
  }

  console.log('✅ Top-up result:', result);

  // Verify the new balance
  const { data: updatedUser } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', user.id)
    .single();

  console.log('✅ Payment credited successfully!');
  console.log('   New balance:', updatedUser.balance);
  console.log('   Previous balance:', user.balance);
  console.log('   Amount added:', 8000);
}

fixPayment().catch(console.error);

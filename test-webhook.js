// Test script to check webhook status
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testWebhookStatus() {
  console.log('=== Testing Webhook Status ===\n');

  // 1. Check recent system logs for webhook errors
  const { data: logs, error: logsError } = await supabase
    .from('system_logs')
    .select('*')
    .or('event_type.eq.payment_failed,event_type.eq.webhook_deposit_failed,event_type.eq.webhook_missing_user_id,event_type.eq.webhook_error')
    .order('created_at', { ascending: false })
    .limit(10);

  if (logsError) {
    console.log('❌ Error fetching logs:', logsError.message);
  } else if (logs && logs.length > 0) {
    console.log('📋 Recent webhook errors:');
    logs.forEach((log, i) => {
      console.log(`  ${i + 1}. ${log.event_type} - ${log.created_at}`);
      if (log.event_data) {
        console.log(`     Data:`, log.event_data);
      }
    });
  } else {
    console.log('✅ No webhook errors found in logs');
  }

  // 2. Check recent transactions
  const { data: txns, error: txnError } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'deposit')
    .order('created_at', { ascending: false })
    .limit(5);

  if (txnError) {
    console.log('\n❌ Error fetching transactions:', txnError.message);
  } else if (txns && txns.length > 0) {
    console.log('\n📋 Recent deposits:');
    txns.forEach((txn, i) => {
      console.log(`  ${i + 1}. ₦${txn.amount} - ${txn.description}`);
      console.log(`     Ref: ${txn.reference}`);
      console.log(`     Date: ${txn.created_at}`);
    });
  } else {
    console.log('\n⚠️  No deposits found (this might be the issue!)');
  }

  // 3. Check if webhook endpoint is accessible
  console.log('\n📋 Webhook endpoint:');
  console.log('  URL: https://afropitchplay.best/api/paystack/webhook');
  console.log('  Method: POST');
  console.log('  Event: charge.success');
}

testWebhookStatus().catch(console.error);

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.iNjHYR4ow8bSqtC_rC5W88bWBknC0Lf8KmBUKEbHR3E'
);

async function checkDatabase() {
  try {
    const { data, error } = await supabase
      .from('pairs')
      .select('id, base_symbol, quote_symbol, price_high_24h, price_low_24h, price, updated_at')
      .limit(10);

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Pairs data from database:');
    console.log('=' .repeat(120));
    if (!data || data.length === 0) {
      console.log('No pairs found in database');
      return;
    }

    data.forEach((pair, idx) => {
      console.log(`\n[${idx + 1}] ${pair.base_symbol}/${pair.quote_symbol}`);
      console.log(`    ID: ${pair.id}`);
      console.log(`    Price: ${pair.price}`);
      console.log(`    24h High: ${pair.price_high_24h}`);
      console.log(`    24h Low: ${pair.price_low_24h}`);
      console.log(`    Updated: ${pair.updated_at}`);
    });
    
    console.log('\n' + '='.repeat(120));
    console.log(`Total: ${data.length} pairs checked`);
    const withHigh = data.filter(p => p.price_high_24h && parseFloat(p.price_high_24h) > 0).length;
    const withLow = data.filter(p => p.price_low_24h && parseFloat(p.price_low_24h) > 0).length;
    console.log(`✅ Pairs with 24h High: ${withHigh}`);
    console.log(`✅ Pairs with 24h Low: ${withLow}`);
  } catch (err) {
    console.error('Exception:', err.message);
  }
}

checkDatabase();

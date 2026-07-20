// Test what GeckoTerminal API actually returns
const GECKO_BASE = 'https://api.geckoterminal.com/api/v2';

async function fetchPoolData() {
  // Test with a known SOL pair - SOL/USDC on Solana
  const solanaAddr = 'So11111111111111111111111111111111111111112'; // SOL token
  
  console.log('🔍 Fetching test data from GeckoTerminal...\n');
  console.log(`URL: ${GECKO_BASE}/networks/solana/pools/multi/${solanaAddr}\n`);
  
  try {
    const response = await fetch(
      `${GECKO_BASE}/networks/solana/pools/multi/${solanaAddr}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    
    const data = await response.json();
    
    if (!data?.data || data.data.length === 0) {
      console.log('❌ No data returned from API');
      return;
    }
    
    const pool = data.data[0];
    console.log('📊 Sample Pool Data Structure:');
    console.log('================================================================================\n');
    console.log(JSON.stringify(pool, null, 2));
    
    console.log('\n🔎 Available attributes in pool.attributes:');
    console.log('================================================================================\n');
    const attrs = pool.attributes;
    const keys = Object.keys(attrs).sort();
    keys.forEach(key => {
      const val = attrs[key];
      if (typeof val === 'object') {
        console.log(`${key}:`);
        console.log(`  →`, JSON.stringify(val));
      } else {
        console.log(`${key}: ${val}`);
      }
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

fetchPoolData();

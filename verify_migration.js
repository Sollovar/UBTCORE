const { Pool } = require('./price-worker/node_modules/pg');

const pool = new Pool({
  host: 'localhost',
  port: 55422,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres'
});

async function verify() {
  try {
    // Check gecko columns
    const cols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='pairs' AND column_name LIKE 'gecko%' 
      ORDER BY column_name
    `);
    
    console.log('✓ Gecko columns created:');
    cols.rows.forEach(row => console.log('  -', row.column_name));
    console.log('');
    
    // Check if pairs have data
    const count = await pool.query(`SELECT COUNT(*) as count FROM pairs`);
    console.log('✓ Pairs in database:', count.rows[0].count);
    
    // Check if gecko data exists
    const geckoCount = await pool.query(`SELECT COUNT(*) as count FROM pairs WHERE gecko_price > 0`);
    console.log('✓ Pairs with gecko prices:', geckoCount.rows[0].count);
    
    // Show sample data
    const sample = await pool.query(`SELECT id, gecko_price, gecko_price_usd, price, price_usd FROM pairs LIMIT 1`);
    if (sample.rows.length > 0) {
      console.log('\n✓ Sample pair data:');
      console.log('  ID:', sample.rows[0].id);
      console.log('  Gecko Price:', sample.rows[0].gecko_price);
      console.log('  Gecko Price USD:', sample.rows[0].gecko_price_usd);
      console.log('  Price (old):', sample.rows[0].price);
      console.log('  Price USD (old):', sample.rows[0].price_usd);
    }
    
    pool.end();
    console.log('\n✅ Migration verified successfully!');
  } catch (err) {
    console.error('✗ Error:', err.message);
    pool.end();
    process.exit(1);
  }
}

verify();

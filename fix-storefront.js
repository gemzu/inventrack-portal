const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xczqrgddqdyzpkpkzzyo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjenFyZ2RkcWR5enBrcGt6enlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzMwNTgsImV4cCI6MjA5MDU0OTA1OH0.ypjdzRisnnaH4y4muFokBY8jpK3cyrafvLnsAZJeOYg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStorefrontConstraint() {
  console.log('Fixing storefronts filter_type constraint...');
  
  // First check current values
  const { data: current } = await supabase
    .from('storefronts')
    .select('filter_type');
  
  console.log('Current filter_type values:', [...new Set(current?.map(r => r.filter_type) || [])]);
  
  // Drop and recreate constraint
  const { error } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE storefronts DROP CONSTRAINT IF EXISTS storefronts_filter_type_check;
          ALTER TABLE storefronts ADD CONSTRAINT storefronts_filter_type_check 
          CHECK (filter_type IN ('all', 'combined'));`
  });
  
  if (error) {
    console.log('RPC error (expected):', error.message);
    // Try direct update approach - set valid values
    console.log('Trying alternative...');
  }
  
  // Check what's in the table
  const { data: items } = await supabase.from('storefronts').select('id, name, filter_type');
  console.log('Storefronts:', items);
  
  // If there are items with invalid filter_type, update them
  if (items?.length > 0) {
    for (const item of items) {
      if (item.filter_type !== 'all' && item.filter_type !== 'combined') {
        console.log('Updating invalid filter_type for:', item.name);
        await supabase
          .from('storefronts')
          .update({ filter_type: 'all' })
          .eq('id', item.id);
      }
    }
  }
  
  console.log('Done!');
}

fixStorefrontConstraint().catch(console.error);
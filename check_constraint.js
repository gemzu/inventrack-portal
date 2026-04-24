const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xczqrgddqdyzpkpkzzyo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjenFyZ2RkcWR5enBrcGt6enlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzMwNTgsImV4cCI6MjA5MDU0OTA1OH0.ypjdzRisnnaH4y4muFokBY8jpK3cyrafvLnsAZJeOYg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixConstraints() {
  console.log('Checking current constraint...');
  
  // First, let's see what's in the table
  const { data: existing } = await supabase.from('storefronts').select('id, filter_type').limit(5);
  console.log('Existing storefronts:', existing);
  
  // Check the constraint definition using a raw query
  const { data: conData, error: conError } = await supabase.rpc('pg_get_constraintdef', { 
    constraintoid: 'storefronts_filter_type_check' 
  });
  console.log('Constraint def:', conData, conError);
  
  // Try inserting with explicit valid values to test
  if (existing && existing.length > 0) {
    console.log('Table has data, constraint may already be OK');
    return;
  }
  
  // Try inserting a test row to trigger validation
  console.log('Trying test insert...');
}

fixConstraints().catch(console.error);
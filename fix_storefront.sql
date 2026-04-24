-- Fix storefronts filter_type constraint
ALTER TABLE storefronts DROP CONSTRAINT IF EXISTS storefronts_filter_type_check;
ALTER TABLE storefronts ADD CONSTRAINT storefronts_filter_type_check 
CHECK (filter_type IN ('all', 'combined'));

-- Show current values after fix
SELECT DISTINCT filter_type FROM storefronts;
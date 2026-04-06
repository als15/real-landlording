-- Migration: Add Security group, Elevator category, and update Exterior sub-services
-- Syncs database with updated service taxonomy document (April 2026)

-- ============================================================================
-- 1. New group: Security
-- ============================================================================
INSERT INTO service_category_groups (key, label, sort_order) VALUES
  ('security', 'Security', 6);

-- ============================================================================
-- 2. New category: Elevator & Vertical Transportation (trades_technical)
--    Insert at sort_order 15 (after architect_design at 14)
-- ============================================================================
INSERT INTO service_categories (key, label, group_key, sort_order, emergency_enabled, finish_level_enabled, external_link, external_url, classifications, search_keywords) VALUES
(
  'elevator_vertical', 'Elevator & Vertical Transportation', 'trades_technical', 15,
  true, false, false, NULL,
  '[{"label":"Service Needed","options":["Routine Maintenance Contract","Elevator Not Working","Emergency Repair (Entrapment / Stuck Between Floors)","Annual Inspection","Re-Inspection After Violation","Code Violation Repair","Modernization / Upgrade","Door Operation Issue","Noise / Vibration Issue","Slow Operation Issue","Cab Interior Repair","Safety Testing","Other"]}]'::jsonb,
  '["elevator","lift","vertical transportation","entrapment"]'::jsonb
);

-- ============================================================================
-- 3. New categories: Security group (5 categories)
-- ============================================================================
INSERT INTO service_categories (key, label, group_key, sort_order, emergency_enabled, finish_level_enabled, external_link, external_url, classifications, search_keywords) VALUES
(
  'security_systems', 'Security Systems (Alarms & Monitoring)', 'security', 1,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["Alarm System Installation","Alarm System Repair","Alarm System Upgrade","Smart Alarm Setup (App-Based)","Monitoring Setup (Self / Professional)","Panic Button Installation","Glass Break Sensors","Motion Sensors","Fire Alarm Integration","Carbon Monoxide Integration","System Takeover (Existing Equipment)","False Alarm Troubleshooting","Insurance Compliance Setup","Commercial Grade System","Other"]}]'::jsonb,
  '["alarm","security system","monitoring","sensor","panic button"]'::jsonb
),
(
  'surveillance', 'Surveillance (Cameras & Recording)', 'security', 2,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["Security Camera Installation","Camera Repair","Camera Upgrade (HD / 4K)","NVR Setup","DVR Setup","Cloud Recording Setup","Remote Viewing Setup","Motion Alert Configuration","Common Area Cameras","Exterior Perimeter Cameras","Doorbell Camera Installation","Other"]},{"label":"Camera Type","options":["Wired","Wireless","PoE","Solar","Battery","Indoor","Outdoor","PTZ","Doorbell Camera","Other"]}]'::jsonb,
  '["camera","surveillance","cctv","nvr","dvr","recording","doorbell camera"]'::jsonb
),
(
  'physical_security', 'Physical Security (Doors & Windows)', 'security', 3,
  true, false, false, NULL,
  '[{"label":"Service Needed","options":["Door Reinforcement","Strike Plate Upgrade","Deadbolt Install / Replace","High-Security Lock Installation","Smart Lock Installation","Keypad Lock Setup","Window Lock Installation","Window Security Bars","Sliding Door Reinforcement","Security Film Installation","Break-In Repair","Emergency Board-Up","Vacancy Securing","Common Entry Reinforcement","Mailbox Lock Replacement","Garage Security Upgrade","Other"]}]'::jsonb,
  '["door reinforcement","deadbolt","smart lock","window security","board-up","vacancy securing"]'::jsonb
),
(
  'locksmith', 'Locksmith', 'security', 4,
  true, false, false, NULL,
  '[{"label":"Service Needed","options":["Emergency Lockout","Lock Rekey","Lock Replacement","Master Key System Setup","Master Key Expansion","Key Duplication","Electronic Key Fob Programming","Commercial Lock System","Safe Opening","Post-Eviction Lock Change","Tenant Turn Rekey","High-Security Lock Upgrade","Other"]},{"label":"Property Type","options":["Single Unit","Duplex","Small Multifamily","Mixed-Use","Commercial","Other"]}]'::jsonb,
  '["locksmith","lock","key","rekey","lockout","master key"]'::jsonb
),
(
  'access_control', 'Access Control', 'security', 5,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["Intercom Installation","Video Intercom Installation","Key Fob Access System","Card Access System","Mobile App Entry Setup","Buzz-In System Repair","Electric Strike Installation","Magnetic Lock Installation","Elevator Access Control","Common Area Access Restriction","Tenant Directory Setup","System Integration with Cameras","Other"]}]'::jsonb,
  '["access control","intercom","key fob","buzzer","card access","magnetic lock"]'::jsonb
);

-- ============================================================================
-- 4. Update Exterior category: add Garage Door Repair, Garage Door Replacement
-- ============================================================================
UPDATE service_categories
SET classifications = '[{"label":"Service Needed","options":["Siding","Siding Repair","Siding Replacement","Windows","Window Repair","Doors","Door Repair","Masonry/Brickwork","Stucco","Decking","Porch Repair","Paving","Welding","Fencing","Railing","Power Washing","Facade Repair","Stoop Repair","Garage Door Repair","Garage Door Replacement"]}]'::jsonb
WHERE key = 'exterior';

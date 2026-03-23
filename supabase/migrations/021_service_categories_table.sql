-- Migration: Create service_category_groups and service_categories tables
-- Moves the hardcoded SERVICE_TAXONOMY to the database for admin CRUD management

-- ============================================================================
-- Table: service_category_groups
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_category_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Table: service_categories
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  group_key TEXT NOT NULL REFERENCES service_category_groups(key) ON UPDATE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  classifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  emergency_enabled BOOLEAN NOT NULL DEFAULT false,
  finish_level_enabled BOOLEAN NOT NULL DEFAULT false,
  external_link BOOLEAN NOT NULL DEFAULT false,
  external_url TEXT,
  search_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for common lookups
CREATE INDEX idx_service_categories_group_key ON service_categories(group_key);
CREATE INDEX idx_service_categories_is_active ON service_categories(is_active);
CREATE INDEX idx_service_category_groups_is_active ON service_category_groups(is_active);

-- ============================================================================
-- RLS Policies: Public SELECT, writes via service role (createAdminClient)
-- ============================================================================
ALTER TABLE service_category_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can read active groups/categories (public API)
CREATE POLICY "Anyone can read service_category_groups"
  ON service_category_groups FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read service_categories"
  ON service_categories FOR SELECT
  USING (true);

-- Writes are done via createAdminClient() (service role bypasses RLS)
-- No INSERT/UPDATE/DELETE policies needed for regular users

-- ============================================================================
-- Updated_at trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_service_taxonomy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_service_category_groups_updated_at
  BEFORE UPDATE ON service_category_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_service_taxonomy_updated_at();

CREATE TRIGGER set_service_categories_updated_at
  BEFORE UPDATE ON service_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_service_taxonomy_updated_at();

-- ============================================================================
-- RPC: Count vendors per service (unnests the TEXT[] services column)
-- ============================================================================
CREATE OR REPLACE FUNCTION count_vendors_per_service()
RETURNS TABLE(service TEXT, count BIGINT) AS $$
  SELECT unnest(services) AS service, count(*) AS count
  FROM vendors
  WHERE status = 'active'
  GROUP BY service;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Seed data: Groups
-- ============================================================================
INSERT INTO service_category_groups (key, label, sort_order) VALUES
  ('trades_technical', 'Fix It / Build It', 1),
  ('property_care', 'Property Care & Maintenance', 2),
  ('compliance_testing', 'Compliance & Testing', 3),
  ('professional_financial', 'Professional & Financial', 4),
  ('creative_knowledge', 'Creative & Knowledge', 5);

-- ============================================================================
-- Seed data: Categories
-- ============================================================================

-- === TRADES & TECHNICAL (group sort_order starting at 1) ===
INSERT INTO service_categories (key, label, group_key, sort_order, emergency_enabled, finish_level_enabled, external_link, external_url, classifications, search_keywords) VALUES
(
  'roofer', 'Roofer', 'trades_technical', 1,
  true, false, false, NULL,
  '[{"label":"Service Needed","options":["Leak Repair","Emergency Tarping","Full Replacement","Partial Replacement","Maintenance/Coating","Flashing Repair","Gutter Repair","Storm Damage","Insurance Claim Support","Skylight Issue","Ice Dam Removal","Roof Inspection Report","Other"]},{"label":"Roof Type","options":["Flat Roof (Rubber/Bitumen)","TPO","Shingle (Asphalt)","Slate","Fiberglass","Metal","Green Roof","Modified Bitumen","Other"]}]'::jsonb,
  '["roof","shingle","gutter","leak"]'::jsonb
),
(
  'general_contractor', 'GC', 'trades_technical', 2,
  false, true, false, NULL,
  '[{"label":"Service Needed","options":["Full Gut","Partial Rehab","Large Rehab","Unit Turn Rehab","Prep for Listing","Kitchen","Bath","Finish Basement","Addition","ADU Conversion","Garage Conversion","Scope for Purchase Decision","Rental Improvement Fund Help","203k Project","Owner Rep Services","Insurance Scope Review","Punch List Completion"]}]'::jsonb,
  '["gc","renovation","rehab","remodel","contractor"]'::jsonb
),
(
  'plumber_sewer', 'Plumber/Sewer', 'trades_technical', 3,
  true, false, false, NULL,
  '[{"label":"Service Needed","options":["Leak","Emergency Leak","Clog/Blockage","No Hot Water","Low Water Pressure","New Installation","Fixture Replacement","Frozen Pipes","Sewer/Water Line","Backflow Issue","Sewer Scope","Hydrojetting","Gas Line Work","Water Pressure Regulator","Other"]},{"label":"Fixture Involved","options":["All","Kitchen Sink","Bathroom Sink","Toilet","Shower/Tub","Water Heater","Tankless Water Heater","Main Line","Outdoor Spigot","Basement","Laundry","Radiator","Other"]}]'::jsonb,
  '["plumbing","drain","pipe","water heater","toilet","plumber"]'::jsonb
),
(
  'waterproofing', 'Waterproofing/Moisture', 'trades_technical', 4,
  true, false, false, NULL,
  '[{"label":"Service Needed","options":["French Drain","Interior Drain System","Exterior Waterproofing","Sump Pump","Sump Pump Repair","Battery Backup Sump","Foundation Sealing","Moisture Intrusion Diagnosis","Crawlspace Encapsulation","Dehumidification System","Efflorescence Treatment","Unknown","Other"]}]'::jsonb,
  '["water","basement","moisture","flood","damp"]'::jsonb
),
(
  'mold_remediation', 'Mold Remediation', 'trades_technical', 5,
  true, false, false, NULL,
  '[{"label":"Service Needed","options":["Mold Inspection","Air Quality Testing","Surface Mold Removal","Full Remediation","Containment Setup","Post-Remediation Clearance","Moisture Source Identification","Prevention / Mitigation Plan","Insurance Documentation"]},{"label":"Area Affected","options":["Basement","Bathroom","Kitchen","Crawlspace","Attic","Wall Cavities","HVAC System","Whole Unit","Other"]}]'::jsonb,
  '["mold","mildew","air quality","fungus"]'::jsonb
),
(
  'electrician', 'Electrician', 'trades_technical', 6,
  true, false, false, NULL,
  '[{"label":"Service Needed","options":["Power Outage","Partial Outage","Flickering Lights","Dead Outlet","GFCI Issues","New Wiring","Rewiring","Fixture Install","Panel Install/Upgrade","Code Violation Repair","EV Charger","Exterior Lighting","Security Lighting","Knob & Tube Replacement","Aluminum Wiring","Other"]},{"label":"Location","options":["Interior","Exterior","Basement","Garage","Common Area","Utility Room","Other"]}]'::jsonb,
  '["electric","wiring","outlet","panel","electrical"]'::jsonb
),
(
  'hvac', 'HVAC Specialist', 'trades_technical', 7,
  true, false, false, NULL,
  '[{"label":"Equipment Type","options":["Gas Furnace","Electric Furnace","Boiler","Central AC","Heat Pump","Ductless Mini-Split","PTAC","Oil Furnace","Radiant Heat"]},{"label":"Service Needed","options":["Routine Maintenance","Seasonal Tune-Up","No Heat","Not Cooling","Short Cycling","Strange Noise","Refrigerant Leak","Condensate Leak","Thermostat Issue","System Replacement","Energy Efficiency Upgrade","Duct Cleaning","Carbon Monoxide Issue","Other"]}]'::jsonb,
  '["ac","air conditioning","heating","furnace","boiler"]'::jsonb
),
(
  'exterior', 'Exterior', 'trades_technical', 8,
  false, true, false, NULL,
  '[{"label":"Service Needed","options":["Siding","Siding Repair","Siding Replacement","Windows","Window Repair","Doors","Door Repair","Masonry/Brickwork","Stucco","Decking","Porch Repair","Paving","Welding","Fencing","Railing","Power Washing","Facade Repair","Stoop Repair"]}]'::jsonb,
  '["siding","windows","doors","masonry","brick","stucco","porch"]'::jsonb
),
(
  'flooring', 'Flooring', 'trades_technical', 9,
  false, true, false, NULL,
  '[{"label":"Service Needed","options":["Hardwood Refinishing/Repair","Hardwood Repair","Carpet Installation","Carpet Removal","LVP/Tile Installation","Subfloor Repair","Moisture Damage Repair","Leveling / Self-Leveler","Other"]}]'::jsonb,
  '["floor","hardwood","carpet","tile","lvp","vinyl"]'::jsonb
),
(
  'appliance_repair', 'Appliance Repair', 'trades_technical', 10,
  true, false, false, NULL,
  '[{"label":"Appliance Type","options":["Washer/Dryer","Oven/Range","Refrigerator","Dishwasher","Microwave","Garbage Disposal","Range Hood","Mini Fridge","Other"]},{"label":"Service Needed","options":["Diagnosis","Replacement","Install","Gas Appliance Hookup"]}]'::jsonb,
  '["appliance","washer","dryer","fridge","oven","dishwasher"]'::jsonb
),
(
  'handyman', 'Handyman', 'trades_technical', 11,
  true, false, false, NULL,
  '[{"label":"Service Needed","options":["General Repair","Punch List","Assembly","Drywall Patching","Small Painting","Caulking/Sealing","Door Adjustments","Minor Plumbing","Minor Electrical","Weather Stripping","Lock Replacement"]}]'::jsonb,
  '["handyman","odd jobs","fix","repair","small job"]'::jsonb
),
(
  'painting', 'Painting', 'trades_technical', 12,
  false, true, false, NULL,
  '[{"label":"Service Needed","options":["Unit Turn Painting","Touch-Up","Exterior","Full Interior Paint","Trim & Doors","Lead-Safe Painting","Stairwells & Common Areas","Graffiti Removal"]}]'::jsonb,
  '["paint","painter","interior paint","exterior paint"]'::jsonb
),
(
  'structural', 'Structural', 'trades_technical', 13,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["Foundation","Basement","Crack Repair","Beams","Joists","Load-Bearing Wall Review","Stairs","Structural Engineer Coordination","Underpinning","Sagging Floors","Other"]}]'::jsonb,
  '["foundation","beam","joist","structural engineer"]'::jsonb
),
(
  'architect_design', 'Architect/Design', 'trades_technical', 14,
  false, true, false, NULL,
  '[{"label":"Service Needed","options":["Plans","As-Built Plans","Zoning","Use Feasibility","Layout","Design Services","Consulting","Permit Drawings","Value Engineering","Change of Use Analysis","Variance Support","Other"]}]'::jsonb,
  '["architect","design","plans","zoning","permit"]'::jsonb
),

-- === PROPERTY CARE & MAINTENANCE (sort_order starting at 1) ===
(
  'cleaning', 'Cleaning', 'property_care', 1,
  true, false, false, NULL,
  '[{"label":"Service Needed","options":["Deep Clean Tenant Turn","Light Clean","Recurring Cleaning","Post-Construction Clean","Move-In Ready Clean","Common Area Cleaning","Biohazard Cleanup"]}]'::jsonb,
  '["clean","cleaner","deep clean","turnover"]'::jsonb
),
(
  'cleanout_junk_removal', 'Clean Out/Junk Removal', 'property_care', 2,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["Light Demo","Light Cleanout","Heavy Cleanout","Hoarder Unit","Construction Debris","Appliance Removal","Furniture Removal","Basement Cleanout","Attic Cleanout","Estate Cleanout","Eviction Cleanout"]}]'::jsonb,
  '["junk","trash","cleanout","removal","demo","hoarder"]'::jsonb
),
(
  'pest_control', 'Pest Control', 'property_care', 3,
  true, false, false, NULL,
  '[{"label":"Service Needed","options":["General Interior Treatment","General Exterior Treatment","Recurring Service","Emergency Infestation","Exclusion/Sealing","Sanitation Support","Other"]},{"label":"Pest Type","options":["Rodents","Bed Bugs","Roaches","Ants","Termite/WDI Inspection","Mosquito/Yard Treatment","Wildlife","Birds/Bats","Fleas","Other"]}]'::jsonb,
  '["pest","exterminator","bug","rodent","mouse","rat","bed bug"]'::jsonb
),
(
  'landscaping_snow', 'Landscaping/Snow', 'property_care', 4,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["Lawn Maintenance","Snow Removal","Tree Trimming","Tree Removal","Hardscaping","Seasonal Cleanup","Ice Management","Drainage Grading","Fence Line Clearing"]}]'::jsonb,
  '["lawn","snow","tree","yard","landscape","ice"]'::jsonb
),
(
  'preventative_maintenance', 'Preventative Maintenance', 'property_care', 5,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["Routine Maintenance Package","Premium Maintenance Package","Annual Property Checkup","Seasonal Prep (Winter/Summer)","Vacancy Prep Package"]}]'::jsonb,
  '["maintenance","preventive","checkup","seasonal"]'::jsonb
),
(
  'property_check', 'Property Check / Site Visit', 'property_care', 6,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["Vacant Property Check","Tenant-Occupied Check","Post-Storm Check","Security Check","Insurance Documentation Visit","Contractor Oversight Visit","Photo/Video Documentation","City Inspection Walkthrough","Pre-Purchase Walkthrough"]}]'::jsonb,
  '["site visit","property check","inspection","walkthrough"]'::jsonb
),
(
  'movers', 'Movers', 'property_care', 7,
  true, false, false, NULL,
  '[{"label":"Service Needed","options":["Small Move","Large Move","Heavy Lifting","Appliance Move","Storage Move","Emergency Move","Tenant Relocation Support"]}]'::jsonb,
  '["moving","mover","relocation","haul"]'::jsonb
),

-- === COMPLIANCE & TESTING (sort_order starting at 1) ===
(
  'lead_testing', 'Lead Testing', 'compliance_testing', 1,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["Lead-Safe Certification","Lead-Free Certification","Risk Assessment","Lead Paint Inspection","Lead Abatement Coordination","Dust Wipe Testing"]}]'::jsonb,
  '["lead","lead paint","lead-safe","certification"]'::jsonb
),
(
  'fire_safety_compliance', 'Fire & Safety Compliance', 'compliance_testing', 2,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["Fire Extinguishers","Smoke Detectors","CO Detectors","Fire Escape","Sprinklers","Emergency Lighting","Exit Signage","Fire Door Inspection","Other"]}]'::jsonb,
  '["fire","smoke detector","sprinkler","safety"]'::jsonb
),
(
  'environmental_testing', 'Environmental Testing', 'compliance_testing', 3,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["Asbestos","Asbestos Abatement","Radon","Soil","Water","Air Quality Testing","Vapor Intrusion","Other"]}]'::jsonb,
  '["asbestos","radon","environmental","air quality","testing"]'::jsonb
),
(
  'compliance_city', 'Compliance & City Requirements', 'compliance_testing', 4,
  false, false, false, NULL,
  '[{"label":"Issue Type","options":["Get Compliant","Remedy Code Violations","Permit Expediting","Zoning","Certificate of Occupancy","Rental License","PHA / Section 8 Inspection Prep","Reinspection Coordination","Violation Clearance Letter"]}]'::jsonb,
  '["compliance","code violation","permit","license","section 8","pha"]'::jsonb
),
(
  'legal_eviction', 'Legal & Eviction Services', 'compliance_testing', 5,
  false, false, false, NULL,
  '[{"label":"Issue Type","options":["Eviction Filing","Possession Assistance","Notice Preparation","Tenant Dispute Consultation","Cash for Keys","Lease Review","Court Representation","Affidavit Preparation","Demand Letter Drafting","Collections / Judgments","Other"]}]'::jsonb,
  '["lawyer","attorney","court","tenant dispute","eviction","legal"]'::jsonb
),
(
  'notary_services', 'Notary Services', 'compliance_testing', 6,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["General Notary","Mobile Notary","Remote Online Notary (RON)","Same-Day / Emergency Notary","After-Hours / Weekend Notary"]},{"label":"Document Type","options":["Deeds","Affidavits","Power of Attorney","Lease Agreements","Loan Documents","Court Documents","Settlement / Closing Docs","Identity Verification"]},{"label":"Location Preference","options":["On-Site (Property)","Office Visit","Remote / Online"]}]'::jsonb,
  '["notary","notarize","signing","witness"]'::jsonb
),
(
  'deed_preparation', 'Deed Preparation & Recording', 'compliance_testing', 7,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["Deed Drafting","Quitclaim Deed","Warranty Deed","Special Warranty Deed","Deed Correction","Add / Remove Owner","LLC ↔ Personal Title Transfer","Estate / Inheritance Transfer"]},{"label":"Recording & Filing","options":["County Recording","Expedited Recording","Recording Status Follow-Up"]},{"label":"Support Services","options":["Notary Coordination","Title Info Coordination","Closing Attorney Coordination"]}]'::jsonb,
  '["deed","quitclaim","title transfer","recording"]'::jsonb
),
(
  'property_tax_appeals', 'Property Tax Appeals', 'compliance_testing', 8,
  false, false, true, 'https://www.incentertaxsolutions.com/partners/sheryl-sitman-at-real-landlording/',
  '[]'::jsonb,
  '["tax","property tax","tax appeal"]'::jsonb
),

-- === PROFESSIONAL & FINANCIAL (sort_order starting at 1) ===
(
  'property_management', 'Property Management / Tenant Placement', 'professional_financial', 1,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["Tenant Placement","Full-Service Management","Managing Agent","Leasing Only","Section 8 Placement","Short-Term Rental Mgmt","Problem Tenant Takeover","Other"]}]'::jsonb,
  '["property manager","tenant placement","management","leasing"]'::jsonb
),
(
  'insurance', 'Insurance', 'professional_financial', 2,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["Property Insurance","Umbrella","Builders Risk","Policy Review","Claims Assistance","Public Adjustor","Restoration Coordination","Loss Runs Review","Other"]}]'::jsonb,
  '["insurance","policy","claim","coverage"]'::jsonb
),
(
  'financing', 'Financing', 'professional_financial', 3,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["Conventional Mortgage","Hard Money","Refi","DSCR","203k","Bridge Loan","Construction Loan","Portfolio Refi","Rate Shopping","Other"]}]'::jsonb,
  '["mortgage","loan","financing","refi","hard money","dscr"]'::jsonb
),
(
  'bookkeeping_accounting', 'Bookkeeping/Accounting', 'professional_financial', 4,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["Rental Bookkeeping","Tax Filing","Entity Setup Support","Expense Cleanup","Portfolio Review","1099 Prep","Cost Segregation Intro"]}]'::jsonb,
  '["bookkeeper","accountant","tax","cpa","accounting"]'::jsonb
),
(
  'acquisitions', 'Acquisitions', 'professional_financial', 5,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["1:1 Philly Investing Coaching","New Construction","Flips","Buy & Hold","Deal Analysis","BRRRR Strategy","Off-Market Sourcing","JV Structuring","Due Diligence Support"]}]'::jsonb,
  '["invest","investing","buy","flip","brrrr","deal"]'::jsonb
),
(
  're_agent', 'RE Agent', 'professional_financial', 6,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["Sales Agent","Buyers Agent","Commercial Agent","Leasing Agent","Investment Sales","Rent Analysis","Other"]}]'::jsonb,
  '["realtor","real estate agent","broker","sales"]'::jsonb
),
(
  'title_ownership', 'Title & Ownership Services', 'professional_financial', 7,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["Title Search (Basic)","Ownership Verification","Lien Lookup","Judgment Search","Title Issue Resolution (Non-Insurance)"]}]'::jsonb,
  '["title","title search","lien","ownership"]'::jsonb
),
(
  'entity_structuring', 'Entity & Asset Structuring', 'professional_financial', 8,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["LLC Setup (Property-Holding)","Series LLC Structuring","Property-to-LLC Transfer Support","Operating Agreement Review (Light)","Registered Agent Setup"]}]'::jsonb,
  '["llc","entity","asset protection","series llc","operating agreement"]'::jsonb
),

-- === CREATIVE & KNOWLEDGE (sort_order starting at 1) ===
(
  'photography', 'Property Photography & Media', 'creative_knowledge', 1,
  false, false, false, NULL,
  '[{"label":"Service Needed","options":["Listing Photos","Matterport","Drone","Floorplan","Drone Video","Virtual Staging","Before/After Documentation"]}]'::jsonb,
  '["photo","photographer","drone","matterport","video","media"]'::jsonb
),
(
  'training', 'Boost My Knowhow (Education)', 'creative_knowledge', 2,
  false, false, false, NULL,
  '[{"label":"Training Type","options":["Landlord Workshops","1:1 Landlord Coaching","1:1 Philly Investing Coaching","Expert Portfolio Review","Section 8 Hacking","Self-Guided Rehab Course","Compliance Training","Financial Optimization","Emergency Preparedness Training"]}]'::jsonb,
  '["training","coaching","education","workshop","learn","course"]'::jsonb
);

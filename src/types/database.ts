// Database types for Real Landlording Platform

export type VendorStatus = 'active' | 'inactive' | 'pending_review' | 'rejected';
export type RequestStatus = 'new' | 'matching' | 'matched' | 'completed' | 'cancelled';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'emergency';
export type SlaStatus = 'not_sent' | 'sent' | 'delivered' | 'viewed' | 'signed' | 'declined' | 'voided';

// Payment status for referral fee tracking
export type PaymentStatus = 'pending' | 'invoiced' | 'paid' | 'overdue' | 'waived' | 'refunded';

// Job outcome reasons for CRM tracking
export type JobOutcomeReason =
  | 'price_too_high'
  | 'timing_issue'
  | 'vendor_unresponsive'
  | 'landlord_cancelled'
  | 'found_other_vendor'
  | 'job_not_needed'
  | 'completed_successfully'
  | 'other';

// Match status for tracking vendor-request lifecycle
export type MatchStatus =
  | 'pending'
  | 'intro_sent'
  | 'estimate_sent'
  | 'vendor_accepted'
  | 'vendor_declined'
  | 'no_response'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

// Property types for service requests
export type PropertyType =
  | 'row_home'
  | 'single_family'
  | 'duplex'
  | 'triplex'
  | 'small_multi'
  | 'large_multi'
  | 'new_construction'
  | 'commercial';

export type UnitCount = '1' | '2-10' | '11-99' | '100+';

export type OccupancyStatus = 'occupied' | 'vacant' | 'partial';

export type ContactPreference = 'phone' | 'email' | 'text' | 'whatsapp' | 'no_preference';

export type BudgetRange =
  | 'under_500'
  | '500_1000'
  | '1000_2500'
  | '2500_5000'
  | '5000_10000'
  | '10000_25000'
  | '25000_50000'
  | '50000_100000'
  | 'over_100000'
  | 'not_sure';

// Finish level for service requests
export type FinishLevel = 'premium' | 'standard' | 'budget';

// Simplified urgency for form UI (maps to UrgencyLevel)
export type SimpleUrgency = 'standard' | 'emergency';

// Service Category Groups
export type ServiceCategoryGroup =
  | 'trades_technical'
  | 'property_care'
  | 'compliance_testing'
  | 'professional_financial'
  | 'creative_knowledge';

export const SERVICE_CATEGORY_GROUP_LABELS: Record<ServiceCategoryGroup, string> = {
  trades_technical: 'Fix It / Build It',
  property_care: 'Property Care & Maintenance',
  compliance_testing: 'Compliance & Testing',
  professional_financial: 'Professional & Financial',
  creative_knowledge: 'Creative & Knowledge',
};

// Service Categories (alphabetically ordered)
export type ServiceCategory =
  | 'acquisitions'
  | 'appliance_repair'
  | 'architect_design'
  | 'bookkeeping_accounting'
  | 'cleaning'
  | 'cleanout_junk_removal'
  | 'compliance_city'
  | 'deed_preparation'
  | 'electrician'
  | 'entity_structuring'
  | 'environmental_testing'
  | 'exterior'
  | 'financing'
  | 'fire_safety_compliance'
  | 'flooring'
  | 'general_contractor'
  | 'handyman'
  | 'hvac'
  | 'insurance'
  | 'landscaping_snow'
  | 'lead_testing'
  | 'legal_eviction'
  | 'mold_remediation'
  | 'movers'
  | 'notary_services'
  | 'painting'
  | 'pest_control'
  | 'photography'
  | 'plumber_sewer'
  | 'preventative_maintenance'
  | 'property_check'
  | 'property_management'
  | 'property_tax_appeals'
  | 're_agent'
  | 'roofer'
  | 'structural'
  | 'title_ownership'
  | 'training'
  | 'waterproofing';

// Service classification question
export interface ServiceClassification {
  label: string;
  options: string[];
}

// Full service taxonomy
export interface ServiceCategoryConfig {
  label: string;
  group: ServiceCategoryGroup;
  classifications: ServiceClassification[];
  externalLink?: boolean; // For categories that link externally (e.g., Property Tax Appeals)
  externalUrl?: string; // URL to redirect to for external link categories
  emergencyEnabled?: boolean; // Whether this service category supports emergency requests
  finishLevelEnabled?: boolean; // Whether this service category shows finish level options
  searchKeywords?: string[]; // Synonyms for search (e.g., "ac" for HVAC)
}

// Complete service taxonomy with all categories and sub-options
export const SERVICE_TAXONOMY: Record<ServiceCategory, ServiceCategoryConfig> = {
  // === TRADES & TECHNICAL ===
  roofer: {
    label: 'Roofer',
    group: 'trades_technical',
    emergencyEnabled: true,
    searchKeywords: ['roof', 'shingle', 'gutter', 'leak'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Leak Repair', 'Emergency Tarping', 'Full Replacement', 'Partial Replacement', 'Maintenance/Coating', 'Flashing Repair', 'Gutter Repair', 'Storm Damage', 'Insurance Claim Support', 'Skylight Issue', 'Ice Dam Removal', 'Roof Inspection Report', 'Other'],
      },
      {
        label: 'Roof Type',
        options: ['Flat Roof (Rubber/Bitumen)', 'TPO', 'Shingle (Asphalt)', 'Slate', 'Fiberglass', 'Metal', 'Green Roof', 'Modified Bitumen', 'Other'],
      },
    ],
  },
  general_contractor: {
    label: 'GC',
    group: 'trades_technical',
    finishLevelEnabled: true,
    searchKeywords: ['gc', 'renovation', 'rehab', 'remodel', 'contractor'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Full Gut', 'Partial Rehab', 'Large Rehab', 'Unit Turn Rehab', 'Prep for Listing', 'Kitchen', 'Bath', 'Finish Basement', 'Addition', 'ADU Conversion', 'Garage Conversion', 'Scope for Purchase Decision', 'Rental Improvement Fund Help', '203k Project', 'Owner Rep Services', 'Insurance Scope Review', 'Punch List Completion'],
      },
    ],
  },
  plumber_sewer: {
    label: 'Plumber/Sewer',
    group: 'trades_technical',
    emergencyEnabled: true,
    searchKeywords: ['plumbing', 'drain', 'pipe', 'water heater', 'toilet', 'plumber'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Leak', 'Emergency Leak', 'Clog/Blockage', 'No Hot Water', 'Low Water Pressure', 'New Installation', 'Fixture Replacement', 'Frozen Pipes', 'Sewer/Water Line', 'Backflow Issue', 'Sewer Scope', 'Hydrojetting', 'Gas Line Work', 'Water Pressure Regulator', 'Other'],
      },
      {
        label: 'Fixture Involved',
        options: ['All', 'Kitchen Sink', 'Bathroom Sink', 'Toilet', 'Shower/Tub', 'Water Heater', 'Tankless Water Heater', 'Main Line', 'Outdoor Spigot', 'Basement', 'Laundry', 'Radiator', 'Other'],
      },
    ],
  },
  waterproofing: {
    label: 'Waterproofing/Moisture',
    group: 'trades_technical',
    emergencyEnabled: true,
    searchKeywords: ['water', 'basement', 'moisture', 'flood', 'damp'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['French Drain', 'Interior Drain System', 'Exterior Waterproofing', 'Sump Pump', 'Sump Pump Repair', 'Battery Backup Sump', 'Foundation Sealing', 'Moisture Intrusion Diagnosis', 'Crawlspace Encapsulation', 'Dehumidification System', 'Efflorescence Treatment', 'Unknown', 'Other'],
      },
    ],
  },
  mold_remediation: {
    label: 'Mold Remediation',
    group: 'trades_technical',
    emergencyEnabled: true,
    searchKeywords: ['mold', 'mildew', 'air quality', 'fungus'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Mold Inspection', 'Air Quality Testing', 'Surface Mold Removal', 'Full Remediation', 'Containment Setup', 'Post-Remediation Clearance', 'Moisture Source Identification', 'Prevention / Mitigation Plan', 'Insurance Documentation'],
      },
      {
        label: 'Area Affected',
        options: ['Basement', 'Bathroom', 'Kitchen', 'Crawlspace', 'Attic', 'Wall Cavities', 'HVAC System', 'Whole Unit', 'Other'],
      },
    ],
  },
  electrician: {
    label: 'Electrician',
    group: 'trades_technical',
    emergencyEnabled: true,
    searchKeywords: ['electric', 'wiring', 'outlet', 'panel', 'electrical'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Power Outage', 'Partial Outage', 'Flickering Lights', 'Dead Outlet', 'GFCI Issues', 'New Wiring', 'Rewiring', 'Fixture Install', 'Panel Install/Upgrade', 'Code Violation Repair', 'EV Charger', 'Exterior Lighting', 'Security Lighting', 'Knob & Tube Replacement', 'Aluminum Wiring', 'Other'],
      },
      {
        label: 'Location',
        options: ['Interior', 'Exterior', 'Basement', 'Garage', 'Common Area', 'Utility Room', 'Other'],
      },
    ],
  },
  hvac: {
    label: 'HVAC Specialist',
    group: 'trades_technical',
    emergencyEnabled: true,
    searchKeywords: ['ac', 'air conditioning', 'heating', 'furnace', 'boiler'],
    classifications: [
      {
        label: 'Equipment Type',
        options: ['Gas Furnace', 'Electric Furnace', 'Boiler', 'Central AC', 'Heat Pump', 'Ductless Mini-Split', 'PTAC', 'Oil Furnace', 'Radiant Heat'],
      },
      {
        label: 'Service Needed',
        options: ['Routine Maintenance', 'Seasonal Tune-Up', 'No Heat', 'Not Cooling', 'Short Cycling', 'Strange Noise', 'Refrigerant Leak', 'Condensate Leak', 'Thermostat Issue', 'System Replacement', 'Energy Efficiency Upgrade', 'Duct Cleaning', 'Carbon Monoxide Issue', 'Other'],
      },
    ],
  },
  exterior: {
    label: 'Exterior',
    group: 'trades_technical',
    finishLevelEnabled: true,
    searchKeywords: ['siding', 'windows', 'doors', 'masonry', 'brick', 'stucco', 'porch'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Siding', 'Siding Repair', 'Siding Replacement', 'Windows', 'Window Repair', 'Doors', 'Door Repair', 'Masonry/Brickwork', 'Stucco', 'Decking', 'Porch Repair', 'Paving', 'Welding', 'Fencing', 'Railing', 'Power Washing', 'Facade Repair', 'Stoop Repair'],
      },
    ],
  },
  flooring: {
    label: 'Flooring',
    group: 'trades_technical',
    finishLevelEnabled: true,
    searchKeywords: ['floor', 'hardwood', 'carpet', 'tile', 'lvp', 'vinyl'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Hardwood Refinishing/Repair', 'Hardwood Repair', 'Carpet Installation', 'Carpet Removal', 'LVP/Tile Installation', 'Subfloor Repair', 'Moisture Damage Repair', 'Leveling / Self-Leveler', 'Other'],
      },
    ],
  },
  appliance_repair: {
    label: 'Appliance Repair',
    group: 'trades_technical',
    emergencyEnabled: true,
    searchKeywords: ['appliance', 'washer', 'dryer', 'fridge', 'oven', 'dishwasher'],
    classifications: [
      {
        label: 'Appliance Type',
        options: ['Washer/Dryer', 'Oven/Range', 'Refrigerator', 'Dishwasher', 'Microwave', 'Garbage Disposal', 'Range Hood', 'Mini Fridge', 'Other'],
      },
      {
        label: 'Service Needed',
        options: ['Diagnosis', 'Replacement', 'Install', 'Gas Appliance Hookup'],
      },
    ],
  },
  handyman: {
    label: 'Handyman',
    group: 'trades_technical',
    emergencyEnabled: true,
    searchKeywords: ['handyman', 'odd jobs', 'fix', 'repair', 'small job'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['General Repair', 'Punch List', 'Assembly', 'Drywall Patching', 'Small Painting', 'Caulking/Sealing', 'Door Adjustments', 'Minor Plumbing', 'Minor Electrical', 'Weather Stripping', 'Lock Replacement'],
      },
    ],
  },
  painting: {
    label: 'Painting',
    group: 'trades_technical',
    finishLevelEnabled: true,
    searchKeywords: ['paint', 'painter', 'interior paint', 'exterior paint'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Unit Turn Painting', 'Touch-Up', 'Exterior', 'Full Interior Paint', 'Trim & Doors', 'Lead-Safe Painting', 'Stairwells & Common Areas', 'Graffiti Removal'],
      },
    ],
  },
  structural: {
    label: 'Structural',
    group: 'trades_technical',
    searchKeywords: ['foundation', 'beam', 'joist', 'structural engineer'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Foundation', 'Basement', 'Crack Repair', 'Beams', 'Joists', 'Load-Bearing Wall Review', 'Stairs', 'Structural Engineer Coordination', 'Underpinning', 'Sagging Floors', 'Other'],
      },
    ],
  },
  architect_design: {
    label: 'Architect/Design',
    group: 'trades_technical',
    finishLevelEnabled: true,
    searchKeywords: ['architect', 'design', 'plans', 'zoning', 'permit'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Plans', 'As-Built Plans', 'Zoning', 'Use Feasibility', 'Layout', 'Design Services', 'Consulting', 'Permit Drawings', 'Value Engineering', 'Change of Use Analysis', 'Variance Support', 'Other'],
      },
    ],
  },

  // === PROPERTY CARE & MAINTENANCE ===
  cleaning: {
    label: 'Cleaning',
    group: 'property_care',
    emergencyEnabled: true,
    searchKeywords: ['clean', 'cleaner', 'deep clean', 'turnover'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Deep Clean Tenant Turn', 'Light Clean', 'Recurring Cleaning', 'Post-Construction Clean', 'Move-In Ready Clean', 'Common Area Cleaning', 'Biohazard Cleanup'],
      },
    ],
  },
  cleanout_junk_removal: {
    label: 'Clean Out/Junk Removal',
    group: 'property_care',
    searchKeywords: ['junk', 'trash', 'cleanout', 'removal', 'demo', 'hoarder'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Light Demo', 'Light Cleanout', 'Heavy Cleanout', 'Hoarder Unit', 'Construction Debris', 'Appliance Removal', 'Furniture Removal', 'Basement Cleanout', 'Attic Cleanout', 'Estate Cleanout', 'Eviction Cleanout'],
      },
    ],
  },
  pest_control: {
    label: 'Pest Control',
    group: 'property_care',
    emergencyEnabled: true,
    searchKeywords: ['pest', 'exterminator', 'bug', 'rodent', 'mouse', 'rat', 'bed bug'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['General Interior Treatment', 'General Exterior Treatment', 'Recurring Service', 'Emergency Infestation', 'Exclusion/Sealing', 'Sanitation Support', 'Other'],
      },
      {
        label: 'Pest Type',
        options: ['Rodents', 'Bed Bugs', 'Roaches', 'Ants', 'Termite/WDI Inspection', 'Mosquito/Yard Treatment', 'Wildlife', 'Birds/Bats', 'Fleas', 'Other'],
      },
    ],
  },
  landscaping_snow: {
    label: 'Landscaping/Snow',
    group: 'property_care',
    searchKeywords: ['lawn', 'snow', 'tree', 'yard', 'landscape', 'ice'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Lawn Maintenance', 'Snow Removal', 'Tree Trimming', 'Tree Removal', 'Hardscaping', 'Seasonal Cleanup', 'Ice Management', 'Drainage Grading', 'Fence Line Clearing'],
      },
    ],
  },
  preventative_maintenance: {
    label: 'Preventative Maintenance',
    group: 'property_care',
    searchKeywords: ['maintenance', 'preventive', 'checkup', 'seasonal'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Routine Maintenance Package', 'Premium Maintenance Package', 'Annual Property Checkup', 'Seasonal Prep (Winter/Summer)', 'Vacancy Prep Package'],
      },
    ],
  },
  property_check: {
    label: 'Property Check / Site Visit',
    group: 'property_care',
    searchKeywords: ['site visit', 'property check', 'inspection', 'walkthrough'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Vacant Property Check', 'Tenant-Occupied Check', 'Post-Storm Check', 'Security Check', 'Insurance Documentation Visit', 'Contractor Oversight Visit', 'Photo/Video Documentation', 'City Inspection Walkthrough', 'Pre-Purchase Walkthrough'],
      },
    ],
  },
  movers: {
    label: 'Movers',
    group: 'property_care',
    emergencyEnabled: true,
    searchKeywords: ['moving', 'mover', 'relocation', 'haul'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Small Move', 'Large Move', 'Heavy Lifting', 'Appliance Move', 'Storage Move', 'Emergency Move', 'Tenant Relocation Support'],
      },
    ],
  },

  // === COMPLIANCE & TESTING ===
  lead_testing: {
    label: 'Lead Testing',
    group: 'compliance_testing',
    searchKeywords: ['lead', 'lead paint', 'lead-safe', 'certification'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Lead-Safe Certification', 'Lead-Free Certification', 'Risk Assessment', 'Lead Paint Inspection', 'Lead Abatement Coordination', 'Dust Wipe Testing'],
      },
    ],
  },
  fire_safety_compliance: {
    label: 'Fire & Safety Compliance',
    group: 'compliance_testing',
    searchKeywords: ['fire', 'smoke detector', 'sprinkler', 'safety'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Fire Extinguishers', 'Smoke Detectors', 'CO Detectors', 'Fire Escape', 'Sprinklers', 'Emergency Lighting', 'Exit Signage', 'Fire Door Inspection', 'Other'],
      },
    ],
  },
  environmental_testing: {
    label: 'Environmental Testing',
    group: 'compliance_testing',
    searchKeywords: ['asbestos', 'radon', 'environmental', 'air quality', 'testing'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Asbestos', 'Asbestos Abatement', 'Radon', 'Soil', 'Water', 'Air Quality Testing', 'Vapor Intrusion', 'Other'],
      },
    ],
  },
  compliance_city: {
    label: 'Compliance & City Requirements',
    group: 'compliance_testing',
    searchKeywords: ['compliance', 'code violation', 'permit', 'license', 'section 8', 'pha'],
    classifications: [
      {
        label: 'Issue Type',
        options: ['Get Compliant', 'Remedy Code Violations', 'Permit Expediting', 'Zoning', 'Certificate of Occupancy', 'Rental License', 'PHA / Section 8 Inspection Prep', 'Reinspection Coordination', 'Violation Clearance Letter'],
      },
    ],
  },
  legal_eviction: {
    label: 'Legal & Eviction Services',
    group: 'compliance_testing',
    searchKeywords: ['lawyer', 'attorney', 'court', 'tenant dispute', 'eviction', 'legal'],
    classifications: [
      {
        label: 'Issue Type',
        options: ['Eviction Filing', 'Possession Assistance', 'Notice Preparation', 'Tenant Dispute Consultation', 'Cash for Keys', 'Lease Review', 'Court Representation', 'Affidavit Preparation', 'Demand Letter Drafting', 'Collections / Judgments', 'Other'],
      },
    ],
  },
  notary_services: {
    label: 'Notary Services',
    group: 'compliance_testing',
    searchKeywords: ['notary', 'notarize', 'signing', 'witness'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['General Notary', 'Mobile Notary', 'Remote Online Notary (RON)', 'Same-Day / Emergency Notary', 'After-Hours / Weekend Notary'],
      },
      {
        label: 'Document Type',
        options: ['Deeds', 'Affidavits', 'Power of Attorney', 'Lease Agreements', 'Loan Documents', 'Court Documents', 'Settlement / Closing Docs', 'Identity Verification'],
      },
      {
        label: 'Location Preference',
        options: ['On-Site (Property)', 'Office Visit', 'Remote / Online'],
      },
    ],
  },
  deed_preparation: {
    label: 'Deed Preparation & Recording',
    group: 'compliance_testing',
    searchKeywords: ['deed', 'quitclaim', 'title transfer', 'recording'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Deed Drafting', 'Quitclaim Deed', 'Warranty Deed', 'Special Warranty Deed', 'Deed Correction', 'Add / Remove Owner', 'LLC ↔ Personal Title Transfer', 'Estate / Inheritance Transfer'],
      },
      {
        label: 'Recording & Filing',
        options: ['County Recording', 'Expedited Recording', 'Recording Status Follow-Up'],
      },
      {
        label: 'Support Services',
        options: ['Notary Coordination', 'Title Info Coordination', 'Closing Attorney Coordination'],
      },
    ],
  },
  property_tax_appeals: {
    label: 'Property Tax Appeals',
    group: 'compliance_testing',
    searchKeywords: ['tax', 'property tax', 'tax appeal'],
    classifications: [],
    externalLink: true,
    externalUrl: 'https://www.incentertaxsolutions.com/partners/sheryl-sitman-at-real-landlording/',
  },

  // === PROFESSIONAL & FINANCIAL ===
  property_management: {
    label: 'Property Management / Tenant Placement',
    group: 'professional_financial',
    searchKeywords: ['property manager', 'tenant placement', 'management', 'leasing'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Tenant Placement', 'Full-Service Management', 'Managing Agent', 'Leasing Only', 'Section 8 Placement', 'Short-Term Rental Mgmt', 'Problem Tenant Takeover', 'Other'],
      },
    ],
  },
  insurance: {
    label: 'Insurance',
    group: 'professional_financial',
    searchKeywords: ['insurance', 'policy', 'claim', 'coverage'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Property Insurance', 'Umbrella', 'Builders Risk', 'Policy Review', 'Claims Assistance', 'Public Adjustor', 'Restoration Coordination', 'Loss Runs Review', 'Other'],
      },
    ],
  },
  financing: {
    label: 'Financing',
    group: 'professional_financial',
    searchKeywords: ['mortgage', 'loan', 'financing', 'refi', 'hard money', 'dscr'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Conventional Mortgage', 'Hard Money', 'Refi', 'DSCR', '203k', 'Bridge Loan', 'Construction Loan', 'Portfolio Refi', 'Rate Shopping', 'Other'],
      },
    ],
  },
  bookkeeping_accounting: {
    label: 'Bookkeeping/Accounting',
    group: 'professional_financial',
    searchKeywords: ['bookkeeper', 'accountant', 'tax', 'cpa', 'accounting'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Rental Bookkeeping', 'Tax Filing', 'Entity Setup Support', 'Expense Cleanup', 'Portfolio Review', '1099 Prep', 'Cost Segregation Intro'],
      },
    ],
  },
  acquisitions: {
    label: 'Acquisitions',
    group: 'professional_financial',
    searchKeywords: ['invest', 'investing', 'buy', 'flip', 'brrrr', 'deal'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['1:1 Philly Investing Coaching', 'New Construction', 'Flips', 'Buy & Hold', 'Deal Analysis', 'BRRRR Strategy', 'Off-Market Sourcing', 'JV Structuring', 'Due Diligence Support'],
      },
    ],
  },
  re_agent: {
    label: 'RE Agent',
    group: 'professional_financial',
    searchKeywords: ['realtor', 'real estate agent', 'broker', 'sales'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Sales Agent', 'Buyers Agent', 'Commercial Agent', 'Leasing Agent', 'Investment Sales', 'Rent Analysis', 'Other'],
      },
    ],
  },
  title_ownership: {
    label: 'Title & Ownership Services',
    group: 'professional_financial',
    searchKeywords: ['title', 'title search', 'lien', 'ownership'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Title Search (Basic)', 'Ownership Verification', 'Lien Lookup', 'Judgment Search', 'Title Issue Resolution (Non-Insurance)'],
      },
    ],
  },
  entity_structuring: {
    label: 'Entity & Asset Structuring',
    group: 'professional_financial',
    searchKeywords: ['llc', 'entity', 'asset protection', 'series llc', 'operating agreement'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['LLC Setup (Property-Holding)', 'Series LLC Structuring', 'Property-to-LLC Transfer Support', 'Operating Agreement Review (Light)', 'Registered Agent Setup'],
      },
    ],
  },

  // === CREATIVE & KNOWLEDGE ===
  photography: {
    label: 'Property Photography & Media',
    group: 'creative_knowledge',
    searchKeywords: ['photo', 'photographer', 'drone', 'matterport', 'video', 'media'],
    classifications: [
      {
        label: 'Service Needed',
        options: ['Listing Photos', 'Matterport', 'Drone', 'Floorplan', 'Drone Video', 'Virtual Staging', 'Before/After Documentation'],
      },
    ],
  },
  training: {
    label: 'Boost My Knowhow (Education)',
    group: 'creative_knowledge',
    searchKeywords: ['training', 'coaching', 'education', 'workshop', 'learn', 'course'],
    classifications: [
      {
        label: 'Training Type',
        options: ['Landlord Workshops', '1:1 Landlord Coaching', '1:1 Philly Investing Coaching', 'Expert Portfolio Review', 'Section 8 Hacking', 'Self-Guided Rehab Course', 'Compliance Training', 'Financial Optimization', 'Emergency Preparedness Training'],
      },
    ],
  },
};

// Helper to get sorted category options for dropdowns
export const getServiceCategoryOptions = () => {
  return Object.entries(SERVICE_TAXONOMY)
    .map(([value, config]) => ({
      value: value as ServiceCategory,
      label: config.label,
      group: config.group,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

// Helper to get categories grouped by their parent group
export const getServiceCategoriesByGroup = () => {
  const grouped: Record<ServiceCategoryGroup, { value: ServiceCategory; label: string }[]> = {
    trades_technical: [],
    property_care: [],
    compliance_testing: [],
    professional_financial: [],
    creative_knowledge: [],
  };

  Object.entries(SERVICE_TAXONOMY).forEach(([value, config]) => {
    grouped[config.group].push({
      value: value as ServiceCategory,
      label: config.label,
    });
  });

  // Sort each group alphabetically
  Object.keys(grouped).forEach((key) => {
    grouped[key as ServiceCategoryGroup].sort((a, b) => a.label.localeCompare(b.label));
  });

  return grouped;
};

// Get ordered groups with their categories for UI display
export const getGroupedServiceCategories = () => {
  const groupOrder: ServiceCategoryGroup[] = [
    'trades_technical',
    'property_care',
    'compliance_testing',
    'professional_financial',
    'creative_knowledge',
  ];

  const categoriesByGroup = getServiceCategoriesByGroup();

  return groupOrder.map((group) => ({
    group,
    label: SERVICE_CATEGORY_GROUP_LABELS[group],
    categories: categoriesByGroup[group],
  }));
};

// Legacy ServiceType for backward compatibility (maps to ServiceCategory)
export type ServiceType = ServiceCategory;

// Legacy labels for backward compatibility
export const SERVICE_TYPE_LABELS: Record<ServiceCategory, string> = Object.fromEntries(
  Object.entries(SERVICE_TAXONOMY).map(([key, config]) => [key, config.label])
) as Record<ServiceCategory, string>;

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  low: 'Low',
  medium: 'Standard',
  high: 'High',
  emergency: 'Emergency',
};

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending_review: 'Pending Review',
  rejected: 'Rejected',
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  new: 'New',
  matching: 'Matching',
  matched: 'Matched',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  row_home: 'Row Home',
  single_family: 'Single Family Detached',
  duplex: 'Duplex',
  triplex: 'Triplex',
  small_multi: 'Small Multi-Family (4-10 units)',
  large_multi: 'Large Multi-Family (11+ units)',
  new_construction: 'New Construction',
  commercial: 'Commercial',
};

export const UNIT_COUNT_LABELS: Record<UnitCount, string> = {
  '1': '1 Unit',
  '2-10': '2-10 Units',
  '11-99': '11-99 Units',
  '100+': '100+ Units',
};

export const OCCUPANCY_STATUS_LABELS: Record<OccupancyStatus, string> = {
  occupied: 'Occupied',
  vacant: 'Vacant',
  partial: 'Partially Occupied',
};

export const CONTACT_PREFERENCE_LABELS: Record<ContactPreference, string> = {
  phone: 'Phone Call',
  email: 'Email',
  text: 'Text Message',
  whatsapp: 'WhatsApp',
  no_preference: 'No Preference',
};

export const BUDGET_RANGE_LABELS: Record<BudgetRange, string> = {
  under_500: 'Under $500',
  '500_1000': '$500 - $1,000',
  '1000_2500': '$1,000 - $2,500',
  '2500_5000': '$2,500 - $5,000',
  '5000_10000': '$5,000 - $10,000',
  '10000_25000': '$10,000 - $25,000',
  '25000_50000': '$25,000 - $50,000',
  '50000_100000': '$50,000 - $100,000',
  over_100000: '$100,000+',
  not_sure: 'Not Sure Yet',
};

export const FINISH_LEVEL_LABELS: Record<FinishLevel, string> = {
  premium: 'Premium Upgrade - High-End',
  standard: 'Standard Rental - Cost-Efficient',
  budget: 'Budget - Extend Lifespan',
};

export const SLA_STATUS_LABELS: Record<SlaStatus, string> = {
  not_sent: 'Not Sent',
  sent: 'Sent',
  delivered: 'Delivered',
  viewed: 'Viewed',
  signed: 'Signed',
  declined: 'Declined',
  voided: 'Voided',
};

// CRM: Payment status labels
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  invoiced: 'Invoiced',
  paid: 'Paid',
  overdue: 'Overdue',
  waived: 'Waived',
  refunded: 'Refunded',
};

// CRM: Job outcome reason labels
export const JOB_OUTCOME_REASON_LABELS: Record<JobOutcomeReason, string> = {
  price_too_high: 'Price Too High',
  timing_issue: 'Timing Issue',
  vendor_unresponsive: 'Vendor Unresponsive',
  landlord_cancelled: 'Landlord Cancelled',
  found_other_vendor: 'Found Other Vendor',
  job_not_needed: 'Job Not Needed',
  completed_successfully: 'Completed Successfully',
  other: 'Other',
};

// CRM: Payment method options
export const PAYMENT_METHOD_OPTIONS = [
  { value: 'check', label: 'Check' },
  { value: 'ach', label: 'ACH/Bank Transfer' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'cash', label: 'Cash' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'other', label: 'Other' },
];

// Vendor business details options
export const EMPLOYEE_COUNT_OPTIONS = [
  { value: 'just_me', label: 'Just me' },
  { value: '2_5', label: '2-5 employees' },
  { value: '6_10', label: '6-10 employees' },
  { value: '11_25', label: '11-25 employees' },
  { value: '26_50', label: '26-50 employees' },
  { value: '50_plus', label: '50+ employees' },
];

export const JOB_SIZE_RANGE_OPTIONS = [
  { value: 'under_500', label: 'Under $500' },
  { value: '500_1k', label: '$500 - $1,000' },
  { value: '1k_5k', label: '$1,000 - $5,000' },
  { value: '5k_10k', label: '$5,000 - $10,000' },
  { value: '10k_25k', label: '$10,000 - $25,000' },
  { value: '25k_plus', label: '$25,000+' },
];

export const ACCEPTED_PAYMENTS_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'credit_debit', label: 'Credit/Debit Card' },
  { value: 'venmo_zelle', label: 'Venmo/Zelle/CashApp' },
  { value: 'financing', label: 'Financing Available' },
];

export const REFERRAL_SOURCE_OPTIONS = [
  { value: 'google', label: 'Google Search' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'friend_colleague', label: 'Friend or Colleague' },
  { value: 'event', label: 'Event or Meetup' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'other', label: 'Other' },
];

// Simplified urgency options for form UI
export const SIMPLE_URGENCY_OPTIONS: Array<{
  value: SimpleUrgency;
  label: string;
  description: string;
  mapsTo: UrgencyLevel;
}> = [
  { value: 'standard', label: 'Standard', description: 'Flexible scheduling', mapsTo: 'medium' },
  { value: 'emergency', label: 'Emergency', description: 'Need help ASAP', mapsTo: 'emergency' },
];

// File upload constraints
export const FILE_UPLOAD_CONSTRAINTS = {
  maxFileSizeMB: 10,
  maxFileSizeBytes: 10 * 1024 * 1024,
  maxFilesPerRequest: 5,
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'video/mp4',
    'video/quicktime',
  ],
};

// Database row types
export interface Landlord {
  id: string;
  auth_user_id: string | null;
  email: string;
  name: string | null;
  phone: string | null;
  properties: string[] | null;
  subscription_tier: string;
  request_count: number;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  auth_user_id: string | null;
  status: VendorStatus;
  contact_name: string;
  email: string;
  phone: string | null;
  business_name: string;
  website: string | null;
  location: string | null;
  services: ServiceCategory[];
  services_other: string | null;
  qualifications: string | null;
  licensed: boolean;
  licensed_areas: string[];
  insured: boolean;
  rental_experience: boolean;
  service_areas: string[];
  call_preferences: string | null;
  portfolio_media: string[] | null;
  performance_score: number;
  total_reviews: number;
  admin_notes: string | null;
  terms_accepted: boolean;
  terms_accepted_at: string | null;
  created_at: string;
  updated_at: string;
  // Vetting score fields
  years_in_business: number | null;
  vetting_score: number | null;
  vetting_admin_adjustment: number;
  // Suspension tracking
  suspended_at: string | null;
  suspension_reason: string | null;
  // Service specialties (equipment types per service category)
  service_specialties: Record<ServiceCategory, string[]> | null;
  // Social media
  social_instagram: string | null;
  social_facebook: string | null;
  social_linkedin: string | null;
  // Business details
  employee_count: string | null;
  emergency_services: boolean;
  job_size_range: string[] | null;
  // Service hours
  service_hours_weekdays: boolean;
  service_hours_weekends: boolean;
  service_hours_24_7: boolean;
  // Payment and referral
  accepted_payments: string[] | null;
  referral_source: string | null;
  referral_source_name: string | null;
  // SLA (Service Level Agreement) tracking
  sla_envelope_id: string | null;
  sla_status: SlaStatus;
  sla_sent_at: string | null;
  sla_signed_at: string | null;
  sla_document_url: string | null;
  // CRM: Vendor fee configuration
  default_fee_type: 'fixed' | 'percentage' | null;
  default_fee_amount: number | null;
  default_fee_percentage: number | null;
}

export interface ServiceRequest {
  id: string;
  landlord_id: string | null;
  landlord_email: string;
  // Name fields (new split fields + legacy)
  first_name: string | null;
  last_name: string | null;
  landlord_name: string | null; // Legacy - kept for backward compatibility
  landlord_phone: string | null;
  contact_preference: ContactPreference | null;
  // Ownership info (new)
  is_owner: boolean | null;
  business_name: string | null;
  // Property info
  property_address: string | null;
  zip_code: string | null;
  property_type: PropertyType | null;
  unit_count: UnitCount | null;
  occupancy_status: OccupancyStatus | null;
  latitude: number | null;
  longitude: number | null;
  // Legacy field - kept for backward compatibility
  property_location: string;
  // Service info
  service_type: ServiceCategory;
  service_details: Record<string, string> | null;
  job_description: string;
  urgency: UrgencyLevel;
  finish_level: FinishLevel | null;
  budget_range: BudgetRange | null;
  // Media uploads (new)
  media_urls: string[];
  // Legacy budget fields - kept for backward compatibility
  budget_min: number | null;
  budget_max: number | null;
  // Status and tracking
  status: RequestStatus;
  intro_sent_at: string | null;
  followup_sent_at: string | null;
  followup_response: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestVendorMatch {
  id: string;
  request_id: string;
  vendor_id: string;
  intro_sent: boolean;
  intro_sent_at: string | null;
  vendor_accepted: boolean | null;
  vendor_responded_at: string | null;
  job_completed: boolean | null;
  review_rating: number | null;
  review_text: string | null;
  review_submitted_at: string | null;
  created_at: string;
  // Match status tracking
  status: MatchStatus;
  response_time_seconds: number | null;
  declined_after_accept: boolean;
  // Multi-dimensional review fields
  review_quality: number | null;
  review_price: number | null;
  review_timeline: number | null;
  review_treatment: number | null;
  // CRM: Job outcome tracking
  job_won: boolean | null;
  job_won_at: string | null;
  job_completed_at: string | null;
  job_outcome_reason: JobOutcomeReason | null;
  outcome_notes: string | null;
  // CRM: Review request tracking
  review_requested_at: string | null;
  review_reminder_sent_at: string | null;
  // CRM: Operational tracking
  expected_due_date: string | null;
  admin_notes: string | null;
}

export interface AdminUser {
  id: string;
  auth_user_id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
}

// CRM: Referral payment tracking
export interface ReferralPayment {
  id: string;
  match_id: string | null;
  vendor_id: string | null;
  request_id: string | null;
  // Payment details
  amount: number;
  fee_type: 'fixed' | 'percentage';
  fee_percentage: number | null;
  // Job cost (what landlord paid vendor)
  job_cost: number | null;
  // Status
  status: PaymentStatus;
  // Dates
  invoice_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  // Payment method
  payment_method: string | null;
  payment_reference: string | null;
  // Notes
  notes: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Extended types with relations
export interface ServiceRequestWithMatches extends ServiceRequest {
  matches?: (RequestVendorMatch & { vendor: Vendor })[];
}

export interface VendorWithMatches extends Vendor {
  matches?: (RequestVendorMatch & { request: ServiceRequest })[];
}

// CRM: Extended match type with all relations for job tracking
export interface CRMJobMatch extends RequestVendorMatch {
  vendor: Vendor;
  request: ServiceRequest;
  payment?: ReferralPayment | null;
}

// CRM: Payment with relations
export interface ReferralPaymentWithRelations extends ReferralPayment {
  vendor?: Vendor | null;
  request?: ServiceRequest | null;
  match?: RequestVendorMatch | null;
}

// CRM: Pipeline stage counts
export interface CRMPipelineCounts {
  intro_sent: number;
  vendor_accepted: number;
  job_won: number;
  in_progress: number;
  completed: number;
  paid: number;
  total_pending_payment: number;
  total_pending_payment_amount: number;
}

// CRM: Conversion stats by service type
export interface ServiceTypeConversion {
  service_type: string;
  total_requests: number;
  matched: number;
  won: number;
  completed: number;
  conversion_rate: number;
  avg_time_to_win_hours: number | null;
}

// CRM: Vendor conversion stats
export interface VendorConversion {
  vendor_id: string;
  vendor_name: string;
  business_name: string;
  total_matches: number;
  jobs_won: number;
  jobs_completed: number;
  conversion_rate: number;
  total_revenue: number;
  avg_rating: number | null;
}

// Form input types
export interface ServiceRequestInput {
  // Contact info (split name fields)
  landlord_email: string;
  first_name: string;
  last_name: string;
  landlord_name?: string; // Legacy - computed from first + last
  landlord_phone?: string;
  contact_preference?: ContactPreference;
  // Ownership info
  is_owner: boolean;
  business_name?: string;
  // Property info
  property_address: string;
  zip_code: string;
  property_type?: PropertyType;
  unit_count?: UnitCount;
  occupancy_status?: OccupancyStatus;
  latitude?: number;
  longitude?: number;
  // Service info
  service_type: ServiceCategory;
  service_details?: Record<string, string>;
  job_description: string;
  urgency: UrgencyLevel;
  finish_level?: FinishLevel;
  budget_range?: BudgetRange;
  // Media uploads
  media_urls?: string[];
}

export interface VendorInput {
  contact_name: string;
  email: string;
  phone?: string;
  business_name: string;
  website?: string;
  location?: string;
  services: ServiceCategory[];
  services_other?: string;
  qualifications?: string;
  licensed: boolean;
  licensed_areas?: string[];
  insured: boolean;
  rental_experience: boolean;
  service_areas: string[];
  call_preferences?: string;
  // Vetting fields
  years_in_business?: number;
  // Service specialties (equipment types per service category)
  service_specialties?: Record<string, string[]>;
  // Social media
  social_instagram?: string;
  social_facebook?: string;
  social_linkedin?: string;
  // Business details
  employee_count?: string;
  emergency_services?: boolean;
  job_size_range?: string[];
  // Service hours
  service_hours_weekdays?: boolean;
  service_hours_weekends?: boolean;
  service_hours_24_7?: boolean;
  // Payment and referral
  accepted_payments?: string[];
  referral_source?: string;
  referral_source_name?: string;
}

export interface LandlordSignupInput {
  email: string;
  name: string;
  phone?: string;
  password: string;
}

// ============================================================================
// Notifications
// ============================================================================

export type NotificationUserType = 'admin' | 'vendor' | 'landlord';

export type NotificationPriority = 'low' | 'medium' | 'high';

// Admin notification types
export type AdminNotificationType =
  | 'new_request'           // A1: New request submitted
  | 'emergency_request'     // A2: Emergency request
  | 'stale_request'         // A3: Request unmatched 3+ days
  | 'new_application'       // A4: New vendor application
  | 'vendor_accepted'       // A5: Vendor accepted job
  | 'vendor_declined'       // A6: Vendor declined job
  | 'vendor_no_response'    // A7: Vendor didn't respond (48h)
  | 'new_review'            // A8: New review submitted
  | 'negative_review'       // A9: Bad review (≤2 stars)
  | 'payment_overdue'       // A10: Payment past due
  | 'sla_signed'            // A11: Vendor signed SLA
  | 'job_completed'         // A12: Job marked completed
  | 'multiple_declines';    // A13: Same request declined 2+ times

// Vendor notification types
export type VendorNotificationType =
  | 'new_job_lead'          // V1: Matched to request
  | 'job_lead_reminder'     // V2: No response after 24h
  | 'job_awarded'           // V3: Landlord selected you
  | 'new_review_received'   // V4: Landlord reviewed you
  | 'payment_received'      // V5: Referral fee paid
  | 'invoice_generated'     // V6: New invoice
  | 'profile_incomplete'    // V7: Missing info
  | 'account_status_change' // V8: Status changed
  | 'sla_action_required';  // V9: Sign SLA

// Landlord notification types
export type LandlordNotificationType =
  | 'request_received'        // L1: Request confirmed
  | 'vendors_matched'         // L2: Intros sent
  | 'landlord_vendor_accepted'// L3: Vendor accepted your job
  | 'all_vendors_declined'    // L4: No vendors accepted
  | 'no_vendors_available'    // L5: Can't match
  | 'review_reminder'         // L6: Leave feedback
  | 'request_status_update';  // L7: Status changed

export type NotificationType =
  | AdminNotificationType
  | VendorNotificationType
  | LandlordNotificationType;

export interface Notification {
  id: string;
  user_type: NotificationUserType;
  user_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  request_id: string | null;
  vendor_id: string | null;
  match_id: string | null;
  read: boolean;
  read_at: string | null;
  dismissed: boolean;
  action_url: string | null;
  priority: NotificationPriority;
  metadata: Record<string, unknown>;
  created_at: string;
  expires_at: string | null;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  // Admin
  new_request: 'New Request',
  emergency_request: 'Emergency Request',
  stale_request: 'Stale Request',
  new_application: 'New Application',
  vendor_accepted: 'Vendor Accepted',
  vendor_declined: 'Vendor Declined',
  vendor_no_response: 'No Response',
  new_review: 'New Review',
  negative_review: 'Negative Review',
  payment_overdue: 'Payment Overdue',
  sla_signed: 'SLA Signed',
  job_completed: 'Job Completed',
  multiple_declines: 'Multiple Declines',
  // Vendor
  new_job_lead: 'New Job Lead',
  job_lead_reminder: 'Lead Reminder',
  job_awarded: 'Job Awarded',
  new_review_received: 'New Review',
  payment_received: 'Payment Received',
  invoice_generated: 'Invoice Generated',
  profile_incomplete: 'Profile Incomplete',
  account_status_change: 'Account Status',
  sla_action_required: 'SLA Required',
  // Landlord
  request_received: 'Request Received',
  vendors_matched: 'Vendors Matched',
  landlord_vendor_accepted: 'Vendor Accepted',
  all_vendors_declined: 'No Vendors Available',
  no_vendors_available: 'No Vendors',
  review_reminder: 'Review Reminder',
  request_status_update: 'Status Update',
};

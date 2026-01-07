// Database types for Real Landlording Platform

export type VendorStatus = 'active' | 'inactive' | 'pending_review' | 'rejected';
export type RequestStatus = 'new' | 'matching' | 'matched' | 'completed' | 'cancelled';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'emergency';
export type SlaStatus = 'not_sent' | 'sent' | 'delivered' | 'viewed' | 'signed' | 'declined' | 'voided';

// Match status for tracking vendor-request lifecycle
export type MatchStatus =
  | 'pending'
  | 'intro_sent'
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
  | 'electrician'
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
  | 'movers'
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
  emergencyEnabled?: boolean; // Whether this service category supports emergency requests
  finishLevelEnabled?: boolean; // Whether this service category shows finish level options
}

// Complete service taxonomy with all categories and sub-options
export const SERVICE_TAXONOMY: Record<ServiceCategory, ServiceCategoryConfig> = {
  // === TRADES & TECHNICAL ===
  roofer: {
    label: 'Roofer',
    group: 'trades_technical',
    emergencyEnabled: true,
    classifications: [
      {
        label: 'Service Needed',
        options: ['Leak Repair', 'Full Replacement', 'Maintenance/Coating', 'Gutter Repair', 'Skylight Issue', 'Other'],
      },
      {
        label: 'Roof Type',
        options: ['Flat Roof (Rubber/Bitumen)', 'Shingle (Asphalt)', 'Slate', 'Fiberglass', 'Metal', 'Other'],
      },
    ],
  },
  general_contractor: {
    label: 'GC',
    group: 'trades_technical',
    finishLevelEnabled: true,
    classifications: [
      {
        label: 'Service Needed',
        options: ['Full Gut', 'Large Rehab', 'Prep for Listing', 'Kitchen', 'Bath', 'Finish Basement', 'Addition', 'Scope for Purchase Decision', 'Rental Improvement Fund Help', '203k Project'],
      },
    ],
  },
  plumber_sewer: {
    label: 'Plumber/Sewer',
    group: 'trades_technical',
    emergencyEnabled: true,
    classifications: [
      {
        label: 'Service Needed',
        options: ['Leak', 'Clog/Blockage', 'No Hot Water', 'Low Water Pressure', 'New Installation', 'Frozen Pipes', 'Sewer/Water Line', 'Sewer Scope', 'Hydrojetting', 'Other'],
      },
      {
        label: 'Fixture Involved',
        options: ['All', 'Kitchen Sink', 'Bathroom Sink', 'Toilet', 'Shower/Tub', 'Water Heater', 'Main Line', 'Outdoor Spigot', 'Basement', 'Other'],
      },
    ],
  },
  waterproofing: {
    label: 'Waterproofing/Moisture',
    group: 'trades_technical',
    emergencyEnabled: true,
    classifications: [
      {
        label: 'Service Needed',
        options: ['French Drain', 'Sump Pump', 'Unknown', 'Other'],
      },
    ],
  },
  electrician: {
    label: 'Electrician',
    group: 'trades_technical',
    emergencyEnabled: true,
    classifications: [
      {
        label: 'Service Needed',
        options: ['Power Outage', 'Flickering Lights', 'Dead Outlet', 'New Wiring', 'Fixture Install', 'Panel Install/Upgrade', 'EV Charger', 'Other'],
      },
      {
        label: 'Location',
        options: ['Interior', 'Exterior', 'Other'],
      },
    ],
  },
  hvac: {
    label: 'HVAC Specialist',
    group: 'trades_technical',
    emergencyEnabled: true,
    classifications: [
      {
        label: 'Equipment Type',
        options: ['Gas Furnace', 'Electric Furnace', 'Boiler', 'Central AC', 'Heat Pump', 'Ductless Mini-Split', 'Oil Furnace'],
      },
      {
        label: 'Service Needed',
        options: ['Routine Maintenance', 'No Heat', 'Not Cooling', 'Strange Noise', 'Leak', 'Thermostat Issue', 'Other'],
      },
    ],
  },
  exterior: {
    label: 'Exterior',
    group: 'trades_technical',
    finishLevelEnabled: true,
    classifications: [
      {
        label: 'Service Needed',
        options: ['Siding', 'Windows', 'Doors', 'Masonry/Brickwork', 'Stucco', 'Decking', 'Paving', 'Welding', 'Fencing'],
      },
    ],
  },
  flooring: {
    label: 'Flooring',
    group: 'trades_technical',
    finishLevelEnabled: true,
    classifications: [
      {
        label: 'Service Needed',
        options: ['Hardwood Refinishing/Repair', 'Carpet Installation', 'LVP/Tile Installation', 'Other'],
      },
    ],
  },
  appliance_repair: {
    label: 'Appliance Repair',
    group: 'trades_technical',
    emergencyEnabled: true,
    classifications: [
      {
        label: 'Appliance Type',
        options: ['Washer/Dryer', 'Oven/Range', 'Refrigerator', 'Dishwasher', 'Other'],
      },
    ],
  },
  handyman: {
    label: 'Handyman',
    group: 'trades_technical',
    emergencyEnabled: true,
    classifications: [
      {
        label: 'Service Needed',
        options: ['General Repair', 'Assembly', 'Drywall Patching', 'Small Painting', 'Minor Plumbing', 'Other'],
      },
    ],
  },
  painting: {
    label: 'Painting',
    group: 'trades_technical',
    finishLevelEnabled: true,
    classifications: [
      {
        label: 'Service Needed',
        options: ['Unit Turn Painting', 'Touch-Up', 'Exterior'],
      },
    ],
  },
  structural: {
    label: 'Structural',
    group: 'trades_technical',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Foundation', 'Basement', 'Joists', 'Stairs', 'Other'],
      },
    ],
  },
  architect_design: {
    label: 'Architect/Design',
    group: 'trades_technical',
    finishLevelEnabled: true,
    classifications: [
      {
        label: 'Service Needed',
        options: ['Plans', 'Zoning', 'Layout', 'Design Services', 'Consulting', 'Other'],
      },
    ],
  },

  // === PROPERTY CARE & MAINTENANCE ===
  cleaning: {
    label: 'Cleaning',
    group: 'property_care',
    emergencyEnabled: true,
    classifications: [
      {
        label: 'Service Needed',
        options: ['Deep Clean Tenant Turn', 'Light Clean', 'Post-Construction Clean'],
      },
    ],
  },
  cleanout_junk_removal: {
    label: 'Clean Out/Junk Removal',
    group: 'property_care',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Light Demo', 'Light Cleanout', 'Heavy Cleanout', 'Construction Debris', 'Appliance Removal', 'Furniture Removal'],
      },
    ],
  },
  pest_control: {
    label: 'Pest Control',
    group: 'property_care',
    emergencyEnabled: true,
    classifications: [
      {
        label: 'Service Needed',
        options: ['General Interior Treatment', 'General Exterior Treatment', 'Recurring Service', 'Other'],
      },
      {
        label: 'Pest Type',
        options: ['Rodents', 'Bed Bugs', 'Termite/WDI Inspection', 'Mosquito/Yard Treatment', 'Wildlife', 'Other'],
      },
    ],
  },
  landscaping_snow: {
    label: 'Landscaping/Snow',
    group: 'property_care',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Lawn Maintenance', 'Snow Removal'],
      },
    ],
  },
  preventative_maintenance: {
    label: 'Preventative Maintenance',
    group: 'property_care',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Routine Maintenance Package', 'Premium Maintenance Package'],
      },
    ],
  },
  property_check: {
    label: 'Property Check / Site Visit',
    group: 'property_care',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Vacant Property Check', 'Tenant-Occupied Check', 'Post-Storm Check', 'Security Check', 'Insurance Documentation Visit', 'Other'],
      },
    ],
  },
  movers: {
    label: 'Movers',
    group: 'property_care',
    emergencyEnabled: true,
    classifications: [
      {
        label: 'Service Needed',
        options: ['Small Move', 'Large Move', 'Heavy Lifting'],
      },
    ],
  },

  // === COMPLIANCE & TESTING ===
  lead_testing: {
    label: 'Lead Testing',
    group: 'compliance_testing',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Lead-Safe Certification', 'Lead-Free Certification'],
      },
    ],
  },
  fire_safety_compliance: {
    label: 'Fire & Safety Compliance',
    group: 'compliance_testing',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Fire Extinguishers', 'Smoke Detectors', 'Fire Escape', 'Sprinklers', 'Other'],
      },
    ],
  },
  environmental_testing: {
    label: 'Environmental Testing',
    group: 'compliance_testing',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Asbestos', 'Radon', 'Soil', 'Water', 'Other'],
      },
    ],
  },
  compliance_city: {
    label: 'Compliance & City Requirements',
    group: 'compliance_testing',
    classifications: [
      {
        label: 'Issue Type',
        options: ['Get Compliant', 'Remedy Code Violations', 'Permit Expediting', 'Zoning', 'PHA Inspection Prep'],
      },
    ],
  },
  legal_eviction: {
    label: 'Legal & Eviction Services',
    group: 'compliance_testing',
    classifications: [
      {
        label: 'Issue Type',
        options: ['Eviction Filing', 'Possession Assistance', 'Notice Preparation', 'Tenant Dispute Consultation', 'Other'],
      },
    ],
  },
  property_tax_appeals: {
    label: 'Property Tax Appeals',
    group: 'compliance_testing',
    classifications: [],
    externalLink: true,
  },

  // === PROFESSIONAL & FINANCIAL ===
  property_management: {
    label: 'Property Management / Tenant Placement',
    group: 'professional_financial',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Tenant Placement', 'Full-Service Management', 'Managing Agent', 'Other'],
      },
    ],
  },
  insurance: {
    label: 'Insurance',
    group: 'professional_financial',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Property Insurance', 'Umbrella', 'Builders Risk', 'Public Adjustor', 'Restoration', 'Other'],
      },
    ],
  },
  financing: {
    label: 'Financing',
    group: 'professional_financial',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Conventional Mortgage', 'Hard Money', 'Refi', 'DSCR', '203k', 'Other'],
      },
    ],
  },
  bookkeeping_accounting: {
    label: 'Bookkeeping/Accounting',
    group: 'professional_financial',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Rental Bookkeeping', 'Tax Filing'],
      },
    ],
  },
  acquisitions: {
    label: 'Acquisitions',
    group: 'professional_financial',
    classifications: [
      {
        label: 'Service Needed',
        options: ['1:1 Philly Investing Coaching', 'New Construction', 'Flips', 'Buy & Hold'],
      },
    ],
  },
  re_agent: {
    label: 'RE Agent',
    group: 'professional_financial',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Sales Agent', 'Buyers Agent', 'Commercial Agent', 'Other'],
      },
    ],
  },

  // === CREATIVE & KNOWLEDGE ===
  photography: {
    label: 'Property Photography & Media',
    group: 'creative_knowledge',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Listing Photos', 'Matterport', 'Drone', 'Floorplan'],
      },
    ],
  },
  training: {
    label: 'Boost My Knowhow (Education)',
    group: 'creative_knowledge',
    classifications: [
      {
        label: 'Training Type',
        options: ['Landlord Workshops', '1:1 Landlord Coaching', '1:1 Philly Investing Coaching', 'Expert Portfolio Review', 'Section 8 Hacking', 'Self-Guided Rehab Course'],
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
}

export interface AdminUser {
  id: string;
  auth_user_id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
}

// Extended types with relations
export interface ServiceRequestWithMatches extends ServiceRequest {
  matches?: (RequestVendorMatch & { vendor: Vendor })[];
}

export interface VendorWithMatches extends Vendor {
  matches?: (RequestVendorMatch & { request: ServiceRequest })[];
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

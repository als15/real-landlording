// Database types for Real Landlording Platform

export type VendorStatus = 'active' | 'inactive' | 'pending_review' | 'rejected';
export type RequestStatus = 'new' | 'matching' | 'matched' | 'completed' | 'cancelled';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'emergency';

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

// Service Categories (alphabetically ordered)
export type ServiceCategory =
  | 'acquisitions'
  | 'appliance_repair'
  | 'architect_design'
  | 'bookkeeping_accounting'
  | 'cleaning'
  | 'cleanout_junk_removal'
  | 'compliance_legal'
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
  | 'locksmith_security'
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
  classifications: ServiceClassification[];
}

// Complete service taxonomy with all categories and sub-options
export const SERVICE_TAXONOMY: Record<ServiceCategory, ServiceCategoryConfig> = {
  acquisitions: {
    label: 'Acquisitions',
    classifications: [
      {
        label: 'Services Needed',
        options: ['1:1 Philly Investing Coaching', 'New Construction', 'Flips', 'Buy & Hold'],
      },
    ],
  },
  appliance_repair: {
    label: 'Appliance Repair',
    classifications: [
      {
        label: 'Appliance Type',
        options: ['Washer / Dryer', 'Oven / Range', 'Refrigerator', 'Dishwasher', 'Other'],
      },
    ],
  },
  architect_design: {
    label: 'Architect / Design',
    classifications: [
      {
        label: 'Services Needed',
        options: ['Plans', 'Zoning', 'Layout', 'Design Services', 'Consulting', 'Other'],
      },
    ],
  },
  bookkeeping_accounting: {
    label: 'Bookkeeping / Accounting',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Rental Bookkeeping', 'Tax Filing'],
      },
    ],
  },
  cleaning: {
    label: 'Cleaning',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Deep Clean Tenant Turn', 'Light Clean', 'Post Construction Clean'],
      },
    ],
  },
  cleanout_junk_removal: {
    label: 'Clean Out / Junk Removal',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Light Demo', 'Light Cleanout', 'Heavy Cleanout', 'Construction Debris', 'Appliance Removal', 'Furniture Removal'],
      },
    ],
  },
  compliance_legal: {
    label: 'Compliance & Legal',
    classifications: [
      {
        label: 'Issue Type',
        options: ['Get Compliant', 'Remedy Code Violations', 'Eviction & Possession Help', 'Permit Expediting / Zoning', 'PHA Inspection Prep'],
      },
    ],
  },
  electrician: {
    label: 'Electrician',
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
  environmental_testing: {
    label: 'Environmental Testing',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Asbestos', 'Radon', 'Soil', 'Water', 'Other'],
      },
    ],
  },
  exterior: {
    label: 'Exterior',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Siding', 'Windows', 'Doors', 'Masonry/Brickwork', 'Stucco', 'Decking', 'Paving', 'Welding', 'Fencing'],
      },
    ],
  },
  financing: {
    label: 'Financing',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Conventional Mortgage', 'Hard Money', 'Refi', 'DSCR', '203k', 'Other'],
      },
    ],
  },
  fire_safety_compliance: {
    label: 'Fire & Safety Compliance',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Fire Extinguishers', 'Smoke Detectors', 'Fire Escape', 'Sprinklers', 'Other'],
      },
    ],
  },
  flooring: {
    label: 'Flooring',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Hardwood Refinishing / Repair', 'Carpet Installation', 'LVP / Tile Installation', 'Other'],
      },
    ],
  },
  general_contractor: {
    label: 'General Contractor',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Full Gut', 'Large Rehab', 'Prep for Listing', 'Kitchen', 'Bath', 'Finish Basement', 'Addition', 'Scope for Purchase Decision', 'Rental Improvement Fund Help', '203k Project'],
      },
    ],
  },
  handyman: {
    label: 'Handyman',
    classifications: [
      {
        label: 'Service Needed',
        options: ['General Repair', 'Assembly', 'Drywall Patching', 'Painting (Small)', 'Minor Plumbing', 'Other'],
      },
    ],
  },
  hvac: {
    label: 'HVAC Specialist',
    classifications: [
      {
        label: 'Equipment Type',
        options: ['Gas Furnace', 'Electric Furnace', 'Boiler (Radiators)', 'Central AC', 'Heat Pump', 'Ductless Mini-Split', 'Oil Furnace'],
      },
      {
        label: 'Service Needed',
        options: ['Routine Maintenance', 'No Heat', 'Not Cooling', 'Strange Noise', 'Leak', 'Thermostat Issue', 'Other'],
      },
    ],
  },
  insurance: {
    label: 'Insurance',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Property Insurance', 'Umbrella', 'Builders Risk', 'Public Adjustor', 'Restoration', 'Other'],
      },
    ],
  },
  landscaping_snow: {
    label: 'Landscaping / Snow Removal',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Lawn Maintenance', 'Snow Removal'],
      },
    ],
  },
  lead_testing: {
    label: 'Lead Testing',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Lead Safe Certification', 'Lead Free Certification'],
      },
    ],
  },
  locksmith_security: {
    label: 'Locksmith / Security',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Lockout Service', 'Rekey / Lock Change', 'Replace Locks', 'Smart Lock / Access Control', 'Security Equipment', 'Other'],
      },
    ],
  },
  movers: {
    label: 'Movers',
    classifications: [
      {
        label: 'Services Needed',
        options: ['Small Move', 'Large Move', 'Heavy Lifting'],
      },
    ],
  },
  painting: {
    label: 'Painting',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Unit Turn Painting', 'Touch-up', 'Exterior'],
      },
    ],
  },
  pest_control: {
    label: 'Pest Control',
    classifications: [
      {
        label: 'Service Needed',
        options: ['General Interior Treatment', 'General Exterior Treatment', 'Recurring Service', 'Other'],
      },
      {
        label: 'Pest Type',
        options: ['Rodents', 'Bed Bug Inspection / Treatment', 'Termite / WDI Inspection', 'Mosquito / Exterior Yard Treatment', 'Wildlife Removal (squirrels, raccoons, birds, etc.)', 'Other'],
      },
    ],
  },
  photography: {
    label: 'Photography',
    classifications: [
      {
        label: 'Services Needed',
        options: ['Listing Photos', 'Matterport', 'Drone', 'Floorplan'],
      },
    ],
  },
  plumber_sewer: {
    label: 'Plumber / Sewer',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Leak', 'Clog / Blockage', 'No Hot Water', 'Low Water Pressure', 'New Installation', 'Frozen Pipes', 'Sewer/Water Line', 'Sewer Scope', 'Hydrojetting', 'Other'],
      },
      {
        label: 'Fixture Involved',
        options: ['Kitchen Sink', 'Bathroom Sink', 'Toilet', 'Shower / Tub', 'Water Heater', 'Main Line', 'Outdoor Spigot', 'Basement', 'Other'],
      },
    ],
  },
  preventative_maintenance: {
    label: 'Preventative Maintenance',
    classifications: [
      {
        label: 'Services Needed',
        options: ['Routine Maintenance Pkg.', 'Premium Maintenance Pkg.', 'Routine Property'],
      },
    ],
  },
  property_check: {
    label: 'Property Check / Site Visit',
    classifications: [
      {
        label: 'Services Needed',
        options: ['Vacant Property Check', 'Tenant-Occupied Property Check', 'Post-Storm Check', 'Security Check (Entry Points)', 'Insurance Documentation Visit', 'Other'],
      },
    ],
  },
  property_management: {
    label: 'Property Management & Tenant Placement',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Tenant Placement', 'Full-Service Management', 'Managing Agent', 'Other'],
      },
    ],
  },
  property_tax_appeals: {
    label: 'Property Tax Appeals',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Property Tax Appeal Consultation'],
      },
    ],
  },
  re_agent: {
    label: 'Real Estate Agent',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Sales Agent', 'Buyers Agent', 'Commercial Agent', 'Other'],
      },
    ],
  },
  roofer: {
    label: 'Roofer',
    classifications: [
      {
        label: 'Service Needed',
        options: ['Leak Repair', 'Full Replacement', 'Maintenance / Coating', 'Gutter Repair', 'Skylight Issue', 'Other'],
      },
      {
        label: 'Roof Type',
        options: ['Flat Roof (Rubber/Bitumen)', 'Shingle (Asphalt)', 'Slate', 'Fiberglass', 'Metal', 'Other'],
      },
    ],
  },
  structural: {
    label: 'Structural',
    classifications: [
      {
        label: 'Services Needed',
        options: ['Foundation', 'Basement', 'Joists', 'Stairs', 'Other'],
      },
    ],
  },
  training: {
    label: 'Boost My Knowhow (Education)',
    classifications: [
      {
        label: 'Training Type',
        options: ['Landlord Workshops', '1:1 Landlord Coaching', '1:1 Philly Investing Coaching', 'Expert Portfolio Review', 'Section 8 Hacking', 'Self Guided Rehab Course'],
      },
    ],
  },
  waterproofing: {
    label: 'Water Proofing / Moisture Control',
    classifications: [
      {
        label: 'Service Needed',
        options: ['French Drain', 'Sump Pump', 'Unknown', 'Other'],
      },
    ],
  },
};

// Helper to get sorted category options for dropdowns
export const getServiceCategoryOptions = () => {
  return Object.entries(SERVICE_TAXONOMY)
    .map(([value, config]) => ({
      value,
      label: config.label,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

// Legacy ServiceType for backward compatibility (maps to ServiceCategory)
export type ServiceType = ServiceCategory;

// Legacy labels for backward compatibility
export const SERVICE_TYPE_LABELS: Record<ServiceCategory, string> = Object.fromEntries(
  Object.entries(SERVICE_TAXONOMY).map(([key, config]) => [key, config.label])
) as Record<ServiceCategory, string>;

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  low: 'Low - No rush',
  medium: 'Medium - Within a week',
  high: 'High - Within 2-3 days',
  emergency: 'Emergency - ASAP',
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
}

export interface ServiceRequest {
  id: string;
  landlord_id: string | null;
  landlord_email: string;
  landlord_name: string | null;
  landlord_phone: string | null;
  contact_preference: ContactPreference | null;
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
  budget_range: BudgetRange | null;
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
  // Contact info
  landlord_email: string;
  landlord_name?: string;
  landlord_phone?: string;
  contact_preference?: ContactPreference;
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
  budget_range?: BudgetRange;
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
  insured: boolean;
  rental_experience: boolean;
  service_areas: string[];
  call_preferences?: string;
}

export interface LandlordSignupInput {
  email: string;
  name: string;
  phone?: string;
  password: string;
}

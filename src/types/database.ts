// Database types for Real Landlording Platform

export type VendorStatus = 'active' | 'inactive' | 'pending_review' | 'rejected';
export type RequestStatus = 'new' | 'matching' | 'matched' | 'completed' | 'cancelled';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'emergency';

export type ServiceType =
  | 'clean_out'
  | 'lead_testing'
  | 'training'
  | 'locksmith_security'
  | 'compliance_legal_tax'
  | 'maintenance'
  | 'electrician'
  | 'move_ins'
  | 'exterior_contractor'
  | 'painter'
  | 'general_contractor'
  | 'pest_control'
  | 'handyman'
  | 'plumber'
  | 'hvac'
  | 'roofer'
  | 'windows_doors';

// Service type labels for display
export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  clean_out: 'Clean-Out Services',
  lead_testing: 'Lead Testing',
  training: 'Boost My Skills (Training)',
  locksmith_security: 'Locksmith / Security',
  compliance_legal_tax: 'Compliance, Legal, Property Tax',
  maintenance: 'Maintenance',
  electrician: 'Electrician',
  move_ins: 'Move-ins',
  exterior_contractor: 'Exterior Contractor',
  painter: 'Painter',
  general_contractor: 'General Contractor',
  pest_control: 'Pest Control',
  handyman: 'Handyman',
  plumber: 'Plumber',
  hvac: 'HVAC',
  roofer: 'Roofer',
  windows_doors: 'Windows / Doors',
};

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
  services: ServiceType[];
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
  service_type: ServiceType;
  property_location: string;
  job_description: string;
  urgency: UrgencyLevel;
  budget_min: number | null;
  budget_max: number | null;
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
  landlord_email: string;
  landlord_name?: string;
  landlord_phone?: string;
  service_type: ServiceType;
  property_location: string;
  job_description: string;
  urgency: UrgencyLevel;
  budget_min?: number;
  budget_max?: number;
}

export interface VendorInput {
  contact_name: string;
  email: string;
  phone?: string;
  business_name: string;
  website?: string;
  location?: string;
  services: ServiceType[];
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

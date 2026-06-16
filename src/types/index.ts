// SnagandGo — Core TypeScript Types

export type OrgType =
  | 'builder'
  | 'hotel'
  | 'homeowner'
  | 'property_manager'
  | 'body_corporate'
  | 'facilities'
  | 'short_term_rental'
  | 'restaurant'
  | 'school'
  | 'retail'

export const ORG_TYPE_CONFIG: Record<OrgType, { label: string; description: string }> = {
  builder:           { label: 'Builder / Developer',  description: 'Construction projects & defect snagging' },
  hotel:             { label: 'Hotel / Hospitality',  description: 'Room maintenance & guest experience' },
  homeowner:         { label: 'Home Owner',           description: 'Household maintenance, staff & trades' },
  property_manager:  { label: 'Property Manager',     description: 'Rental portfolio & tenant maintenance' },
  body_corporate:    { label: 'Body Corporate / HOA', description: 'Common areas & complex maintenance' },
  facilities:        { label: 'Facilities Manager',   description: 'Commercial buildings & office parks' },
  short_term_rental: { label: 'Short-term Rental',    description: 'Airbnb / VRBO turnover & maintenance' },
  restaurant:        { label: 'Restaurant / F&B',     description: 'Kitchen & dining area maintenance' },
  school:            { label: 'School / Campus',      description: 'Education facility maintenance' },
  retail:            { label: 'Retail / Multi-store', description: 'Store maintenance across locations' },
}

export interface DashboardTerms {
  project: string
  projects: string
  issue: string
  issues: string
  contractor: string
  internalLabel: string
  externalLabel: string
}

export const DASHBOARD_TERMS: Record<OrgType, DashboardTerms> = {
  builder:           { project: 'Project',  projects: 'Projects',   issue: 'Snag',  issues: 'Snags',  contractor: 'Contractor',       internalLabel: 'Staff',            externalLabel: 'Subcontractor' },
  hotel:             { project: 'Property', projects: 'Properties', issue: 'Issue', issues: 'Issues', contractor: 'Staff member',     internalLabel: 'Maintenance Staff', externalLabel: 'Contractor' },
  homeowner:         { project: 'Home',     projects: 'Homes',      issue: 'Job',   issues: 'Jobs',   contractor: 'Service provider', internalLabel: 'Household Staff',   externalLabel: 'Tradesperson' },
  property_manager:  { project: 'Property', projects: 'Properties', issue: 'Issue', issues: 'Issues', contractor: 'Contractor',       internalLabel: 'Staff',            externalLabel: 'Contractor' },
  body_corporate:    { project: 'Complex',  projects: 'Complexes',  issue: 'Issue', issues: 'Issues', contractor: 'Contractor',       internalLabel: 'Building Staff',   externalLabel: 'Contractor' },
  facilities:        { project: 'Site',     projects: 'Sites',      issue: 'Job',   issues: 'Jobs',   contractor: 'Contractor',       internalLabel: 'In-house Team',    externalLabel: 'Contractor' },
  short_term_rental: { project: 'Property', projects: 'Properties', issue: 'Issue', issues: 'Issues', contractor: 'Service provider', internalLabel: 'Housekeeper',      externalLabel: 'Tradesperson' },
  restaurant:        { project: 'Venue',    projects: 'Venues',     issue: 'Issue', issues: 'Issues', contractor: 'Contractor',       internalLabel: 'Staff',            externalLabel: 'Contractor' },
  school:            { project: 'Campus',   projects: 'Campuses',   issue: 'Job',   issues: 'Jobs',   contractor: 'Contractor',       internalLabel: 'Maintenance Staff', externalLabel: 'Contractor' },
  retail:            { project: 'Store',    projects: 'Stores',     issue: 'Issue', issues: 'Issues', contractor: 'Contractor',       internalLabel: 'Staff',            externalLabel: 'Contractor' },
}

export type SnagStatus = 'open' | 'assigned' | 'in_progress' | 'fixed' | 'approved' | 'closed' | 'rejected'
// Active statuses in the current workflow (in_progress / closed kept for legacy data)
export const ACTIVE_STATUSES: SnagStatus[] = ['open', 'assigned', 'rejected']
export type SnagPriority = 'low' | 'medium' | 'high' | 'critical'
export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'archived'
export type UnitType = 'house' | 'apartment' | 'villa' | 'office' | 'townhouse' | 'penthouse' | 'retail' | 'other'
export type DefectCategory = 'paint' | 'crack' | 'tile' | 'water' | 'fitting' | 'alignment' | 'finishing' | 'electrical' | 'plumbing' | 'structural' | 'carpentry' | 'glazing' | 'hvac' | 'other'
export type OrgMemberRole = 'owner' | 'admin' | 'manager' | 'inspector' | 'viewer'

export interface Organization {
  id: string
  name: string
  slug: string
  org_type: OrgType
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  vat_number: string | null
  country: string
  currency: string
  plan: string
  plan_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  whatsapp: string | null
  job_title: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  org_id: string
  name: string
  description: string | null
  address: string | null
  city: string | null
  province: string | null
  status: ProjectStatus
  image_url: string | null
  start_date: string | null
  target_date: string | null
  completed_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // joined
  stats?: ProjectStats
}

export interface ProjectStats {
  total_snags: number
  open_snags: number
  in_progress_snags: number
  resolved_snags: number
  critical_snags: number
  completion_pct: number
}

export interface Unit {
  id: string
  project_id: string
  name: string
  unit_type: UnitType
  floor_number: number | null
  description: string | null
  image_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // joined
  rooms?: Room[]
  stats?: UnitStats
}

export interface UnitStats {
  total_snags: number
  open_snags: number
  resolved_snags: number
  critical_snags: number
  completion_pct: number
}

export interface Room {
  id: string
  unit_id: string
  name: string
  room_order: number
  created_at: string
  // joined
  snags?: Snag[]
}

export interface Contractor {
  id: string
  org_id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  trade: string | null
  is_internal: boolean
  access_token: string
  token_expires_at: string
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Snag {
  id: string
  project_id: string
  unit_id: string
  room_id: string | null
  title: string
  description: string | null
  category: DefectCategory
  status: SnagStatus
  priority: SnagPriority
  assigned_to: string | null
  assigned_at: string | null
  due_date: string | null
  fixed_at: string | null
  closed_at: string | null
  floor_plan_id: string | null
  pin_x: number | null
  pin_y: number | null
  ai_suggested: boolean
  ai_confidence: number | null
  created_by: string | null
  created_at: string
  updated_at: string
  snag_number: number
  // joined
  attachments?: Attachment[]
  comments?: Comment[]
  contractor?: Contractor | null
  room?: Room | null
}

export interface Attachment {
  id: string
  snag_id: string
  storage_path: string
  public_url: string
  file_name: string | null
  file_size: number | null
  mime_type: string
  is_resolution: boolean
  uploaded_by_contractor: boolean
  uploaded_by: string | null
  created_at: string
}

export interface Comment {
  id: string
  snag_id: string
  body: string
  author_id: string | null
  author_contractor_id: string | null
  created_at: string
  // joined
  author?: Profile | null
  contractor?: Contractor | null
}

export interface Floorplan {
  id: string
  unit_id: string
  name: string
  storage_path: string
  public_url: string
  floor_number: number
  created_by: string | null
  created_at: string
}

export interface SnagHistory {
  id: string
  snag_id: string
  from_status: SnagStatus | null
  to_status: SnagStatus
  changed_by: string | null
  changed_by_contractor: string | null
  note: string | null
  created_at: string
}

// AI Analysis Response
export interface AISuggestion {
  title: string
  category: DefectCategory
  description: string
  severity: SnagPriority
  confidence: number
}

// Status display config
export const STATUS_CONFIG: Record<SnagStatus, { label: string; color: string; bg: string }> = {
  open:        { label: 'Open',        color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
  assigned:    { label: 'Assigned',    color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  in_progress: { label: 'In Progress', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  fixed:       { label: 'Fixed',       color: 'text-teal-700',   bg: 'bg-teal-50 border-teal-200' },
  approved:    { label: 'Approved',    color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
  closed:      { label: 'Closed',      color: 'text-gray-600',   bg: 'bg-gray-50 border-gray-200' },
  rejected:    { label: 'Rejected',    color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-200' },
}

export const PRIORITY_CONFIG: Record<SnagPriority, { label: string; color: string; dot: string }> = {
  low:      { label: 'Low',      color: 'text-gray-500',  dot: 'bg-gray-400' },
  medium:   { label: 'Medium',   color: 'text-yellow-700', dot: 'bg-yellow-500' },
  high:     { label: 'High',     color: 'text-orange-700', dot: 'bg-orange-500' },
  critical: { label: 'Critical', color: 'text-red-700',   dot: 'bg-red-500' },
}

export const DEFAULT_ROOMS = [
  'Kitchen',
  'Lounge',
  'Dining Room',
  'Main Bedroom',
  'Bedroom 2',
  'Bedroom 3',
  'Main Bathroom',
  'En-suite',
  'Guest Toilet',
  'Study',
  'Patio',
  'Balcony',
  'Garage',
  'Laundry',
  'Entrance Hall',
  'Passage',
  'Storeroom',
]

export const SA_PROVINCES = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
]

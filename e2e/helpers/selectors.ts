/**
 * Common UI Selectors for E2E Tests
 *
 * Centralized selectors for Ant Design components and common UI elements.
 * Using these selectors makes tests more maintainable.
 */

// ============================================================================
// Ant Design Components
// ============================================================================

export const antd = {
  // Tables
  table: '.ant-table',
  tableRow: '.ant-table-row',
  tableCell: '.ant-table-cell',
  tableEmpty: '.ant-empty',

  // Forms
  formItem: '.ant-form-item',
  formError: '.ant-form-item-explain-error',
  input: '.ant-input',
  select: '.ant-select',
  selectDropdown: '.ant-select-dropdown',
  selectOption: '.ant-select-item-option',
  checkbox: '.ant-checkbox',
  radio: '.ant-radio',
  textarea: '.ant-input-textarea textarea',
  datePicker: '.ant-picker',

  // Buttons
  button: '.ant-btn',
  primaryButton: '.ant-btn-primary',
  dangerButton: '.ant-btn-dangerous',

  // Modals & Drawers
  modal: '.ant-modal',
  modalContent: '.ant-modal-content',
  modalHeader: '.ant-modal-header',
  modalBody: '.ant-modal-body',
  modalFooter: '.ant-modal-footer',
  drawer: '.ant-drawer',
  drawerContent: '.ant-drawer-content',
  drawerHeader: '.ant-drawer-header',
  drawerBody: '.ant-drawer-body',

  // Messages & Notifications
  message: '.ant-message',
  messageSuccess: '.ant-message-success',
  messageError: '.ant-message-error',
  notification: '.ant-notification',

  // Results
  result: '.ant-result',
  resultSuccess: '.ant-result-success',
  resultError: '.ant-result-error',

  // Loading
  spin: '.ant-spin',
  spinning: '.ant-spin-spinning',
  skeleton: '.ant-skeleton',

  // Tags & Badges
  tag: '.ant-tag',
  badge: '.ant-badge',

  // Cards
  card: '.ant-card',
  cardBody: '.ant-card-body',

  // Tabs
  tabs: '.ant-tabs',
  tabPane: '.ant-tabs-tabpane',
  tabActive: '.ant-tabs-tab-active',

  // Descriptions
  descriptions: '.ant-descriptions',
  descriptionsItem: '.ant-descriptions-item',

  // Divider
  divider: '.ant-divider',

  // Popconfirm
  popconfirm: '.ant-popconfirm',

  // Rate (stars)
  rate: '.ant-rate',
  rateStar: '.ant-rate-star',
};

// ============================================================================
// Page-Specific Selectors
// ============================================================================

export const pages = {
  // Login pages
  login: {
    emailInput: 'input[type="email"], input[name="email"], #email',
    passwordInput: 'input[type="password"], input[name="password"], #password',
    submitButton: 'button[type="submit"]',
    forgotPasswordLink: 'a:has-text("Forgot"), a:has-text("forgot")',
    signupLink: 'a:has-text("Sign up"), a:has-text("Create account")',
  },

  // Signup pages
  signup: {
    nameInput: 'input[name="name"], #name',
    emailInput: 'input[type="email"], input[name="email"], #email',
    passwordInput: 'input[name="password"], #password',
    confirmPasswordInput: 'input[name="confirmPassword"], #confirmPassword',
    submitButton: 'button[type="submit"]',
    termsCheckbox: 'input[name="terms"], #terms',
  },

  // Request form
  requestForm: {
    // Step 1: Contact
    firstName: 'input[name="first_name"], #first_name',
    lastName: 'input[name="last_name"], #last_name',
    email: 'input[name="email"], #email',
    phone: 'input[name="phone"], #phone',

    // Step 2: Property & Service
    serviceType: '[name="service_type"], #service_type',
    propertyAddress: 'input[name="property_address"], #property_address',
    zipCode: 'input[name="zip_code"], #zip_code',
    jobDescription: 'textarea[name="job_description"], #job_description',
    urgency: '[name="urgency"], #urgency',

    // Navigation
    nextButton: 'button:has-text("Next")',
    prevButton: 'button:has-text("Previous"), button:has-text("Back")',
    submitButton: 'button:has-text("Submit")',

    // Success
    successResult: '.ant-result-success, [data-testid="success"]',
    signupNudge: ':has-text("Create an account"), :has-text("Sign up")',
  },

  // Vendor application form
  vendorApplication: {
    contactName: 'input[name="contact_name"], #contact_name',
    businessName: 'input[name="business_name"], #business_name',
    email: 'input[name="email"], #email',
    phone: 'input[name="phone"], #phone',
    website: 'input[name="website"], #website',
    services: '[name="services"]',
    serviceAreas: '[name="service_areas"]',
    qualifications: 'textarea[name="qualifications"], #qualifications',
    yearsInBusiness: '[name="years_in_business"]',
    licensed: 'input[name="licensed"], #licensed',
    insured: 'input[name="insured"], #insured',
    rentalExperience: 'input[name="rental_experience"], #rental_experience',
    termsAccepted: 'input[name="terms_accepted"], #terms_accepted',
    submitButton: 'button:has-text("Submit")',
    successResult: '.ant-result-success, [data-testid="success"]',
  },

  // Landlord dashboard
  landlordDashboard: {
    requestsTable: '.ant-table',
    requestRow: '.ant-table-row',
    viewRequestButton: 'button:has-text("View")',
    leaveReviewButton: 'button:has-text("Review"), button:has-text("Leave Review")',
    requestDetailsDrawer: '.ant-drawer',
    profileLink: 'a:has-text("Profile")',
    settingsLink: 'a:has-text("Settings")',
    logoutButton: 'button:has-text("Logout")',
  },

  // Vendor dashboard
  vendorDashboard: {
    jobsTable: '.ant-table',
    jobRow: '.ant-table-row',
    viewJobButton: 'button:has-text("View")',
    acceptJobButton: 'button:has-text("Accept")',
    statsCards: '.ant-card',
    profileLink: 'a:has-text("Profile")',
    logoutButton: 'button:has-text("Logout")',
  },

  // Admin pages
  admin: {
    // Navigation
    requestsLink: 'a:has-text("Requests")',
    vendorsLink: 'a:has-text("Vendors")',
    applicationsLink: 'a:has-text("Applications")',
    landlordsLink: 'a:has-text("Landlords")',
    analyticsLink: 'a:has-text("Analytics")',

    // Common
    table: '.ant-table',
    tableRow: '.ant-table-row',
    searchInput: 'input[placeholder*="search" i], input[placeholder*="Search" i]',
    statusFilter: '.ant-select:has-text("Status"), .ant-select:has-text("status")',
    exportButton: 'button:has-text("Export")',
    addButton: 'button:has-text("Add")',
    detailsDrawer: '.ant-drawer',

    // Request management
    matchButton: 'button:has-text("Match")',
    matchModal: '.ant-modal:has-text("Match")',
    vendorCheckbox: '[data-vendor-id]',
    confirmMatchButton: 'button:has-text("Confirm")',
    resendIntroButton: 'button:has-text("Resend")',

    // Vendor management
    approveButton: 'button:has-text("Approve")',
    rejectButton: 'button:has-text("Reject")',
    editButton: 'button:has-text("Edit")',
    statusBadge: '.ant-tag, .ant-badge',

    // Applications
    applicationDetailsDrawer: '.ant-drawer',
    vettingScore: ':has-text("Vetting Score")',
  },
};

// ============================================================================
// Dynamic Selector Builders
// ============================================================================

/**
 * Build selector for table row containing specific text
 */
export function tableRowWithText(text: string): string {
  return `${antd.tableRow}:has-text("${text}")`;
}

/**
 * Build selector for button with specific text
 */
export function buttonWithText(text: string): string {
  return `button:has-text("${text}")`;
}

/**
 * Build selector for link with specific text
 */
export function linkWithText(text: string): string {
  return `a:has-text("${text}")`;
}

/**
 * Build selector for input with specific name
 */
export function inputByName(name: string): string {
  return `input[name="${name}"], #${name}`;
}

/**
 * Build selector for select with specific name
 */
export function selectByName(name: string): string {
  return `[name="${name}"], #${name}, .ant-select:has([name="${name}"])`;
}

/**
 * Build selector for modal with specific title
 */
export function modalWithTitle(title: string): string {
  return `${antd.modal}:has-text("${title}")`;
}

/**
 * Build selector for drawer with specific title
 */
export function drawerWithTitle(title: string): string {
  return `${antd.drawer}:has-text("${title}")`;
}

/**
 * Build selector for tag with specific text/color
 */
export function tagWithText(text: string): string {
  return `${antd.tag}:has-text("${text}")`;
}

/**
 * Build selector for vendor card/row by ID
 */
export function vendorById(vendorId: string): string {
  return `[data-vendor-id="${vendorId}"]`;
}

/**
 * Build selector for request card/row by ID
 */
export function requestById(requestId: string): string {
  return `[data-request-id="${requestId}"]`;
}

// ============================================================================
// Accessibility Selectors
// ============================================================================

export const a11y = {
  // ARIA roles
  roleButton: '[role="button"]',
  roleLink: '[role="link"]',
  roleDialog: '[role="dialog"]',
  roleAlert: '[role="alert"]',
  roleTable: '[role="table"]',
  roleRow: '[role="row"]',
  roleCell: '[role="cell"]',
  roleTab: '[role="tab"]',
  roleTabpanel: '[role="tabpanel"]',

  // ARIA labels
  labelledBy: (id: string) => `[aria-labelledby="${id}"]`,
  describedBy: (id: string) => `[aria-describedby="${id}"]`,

  // States
  ariaExpanded: '[aria-expanded="true"]',
  ariaSelected: '[aria-selected="true"]',
  ariaDisabled: '[aria-disabled="true"]',
  ariaHidden: '[aria-hidden="true"]',
};

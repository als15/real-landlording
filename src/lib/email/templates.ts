import { ServiceRequest, Vendor, SERVICE_TYPE_LABELS, URGENCY_LABELS, PROPERTY_TYPE_LABELS, FINISH_LEVEL_LABELS } from '@/types/database';

// Base email wrapper
function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1890ff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #fff; padding: 24px; border: 1px solid #e8e8e8; border-top: none; }
    .footer { background: #fafafa; padding: 16px; text-align: center; font-size: 12px; color: #888; border: 1px solid #e8e8e8; border-top: none; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0; }
    .info-box { background: #f5f5f5; padding: 16px; border-radius: 4px; margin: 16px 0; }
    .vendor-card { border: 1px solid #e8e8e8; padding: 16px; border-radius: 8px; margin: 12px 0; }
    h1, h2, h3 { margin-top: 0; }
    ul { padding-left: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Real Landlording</h1>
      <p style="margin: 8px 0 0;">Philadelphia's Landlord Community</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Real Landlording | Philadelphia, PA</p>
      <p>Questions? Reply to this email or contact us at support@reallandlording.com</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Email when landlord submits a request
export function requestReceivedEmail(request: ServiceRequest): { subject: string; html: string } {
  const serviceLabel = SERVICE_TYPE_LABELS[request.service_type] || request.service_type;

  return {
    subject: `Request Received: ${serviceLabel}`,
    html: emailWrapper(`
      <h2>We've Received Your Request!</h2>
      <p>Hi ${request.landlord_name || 'there'},</p>
      <p>Thanks for submitting your service request. We're now matching you with vetted vendors who can help.</p>

      <div class="info-box">
        <h3 style="margin-top: 0;">Request Details</h3>
        <p><strong>Service:</strong> ${serviceLabel}</p>
        <p><strong>Location:</strong> ${request.property_location}</p>
        <p><strong>Urgency:</strong> ${URGENCY_LABELS[request.urgency]}</p>
        <p><strong>Description:</strong> ${request.job_description}</p>
      </div>

      <h3>What's Next?</h3>
      <ul>
        <li>We'll match you with up to 3 qualified vendors</li>
        <li>You'll receive an introduction email with their contact info</li>
        <li>Reach out directly to get quotes and schedule work</li>
      </ul>

      <p>Most matches are made within 24-48 hours.</p>

      <h3>Helpful tips when hiring a service provider:</h3>
      <ul>
        <li>Verify insurance & licensing before work begins</li>
        <li>Get a detailed estimate including scope, cost, and timeline</li>
        <li>Use clear payment terms – avoid full payment upfront</li>
        <li>Check references and recent work</li>
        <li>Always use a written contract</li>
      </ul>

      <p style="margin-top: 24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" class="button">
          Track Your Request
        </a>
      </p>
    `),
  };
}

// Introduction email to landlord with matched vendors
export function landlordIntroEmail(
  request: ServiceRequest,
  vendors: Vendor[]
): { subject: string; html: string } {
  const serviceLabel = SERVICE_TYPE_LABELS[request.service_type] || request.service_type;

  const vendorCards = vendors
    .map(
      (v) => `
      <div class="vendor-card">
        <h3 style="margin: 0 0 8px;">${v.business_name}</h3>
        <p style="margin: 4px 0;"><strong>Contact:</strong> ${v.contact_name}</p>
        <p style="margin: 4px 0;"><strong>Phone:</strong> ${v.phone || 'N/A'}</p>
        <p style="margin: 4px 0;"><strong>Email:</strong> ${v.email}</p>
        ${v.website ? `<p style="margin: 4px 0;"><strong>Website:</strong> <a href="${v.website}">${v.website}</a></p>` : ''}
        ${v.licensed ? '<span style="background: #52c41a; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 4px;">Licensed</span>' : ''}
        ${v.insured ? '<span style="background: #52c41a; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 4px;">Insured</span>' : ''}
        ${v.rental_experience ? '<span style="background: #1890ff; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Rental Experience</span>' : ''}
      </div>
    `
    )
    .join('');

  return {
    subject: `Your ${serviceLabel} Vendors Are Ready!`,
    html: emailWrapper(`
      <h2>We Found Your Vendors!</h2>
      <p>Hi ${request.landlord_name || 'there'},</p>
      <p>Great news! We've matched you with ${vendors.length} vetted vendor${vendors.length > 1 ? 's' : ''} for your ${serviceLabel.toLowerCase()} request at ${request.property_location}.</p>

      <h3>Your Matched Vendors</h3>
      ${vendorCards}

      <div class="info-box">
        <h3 style="margin-top: 0;">Your Request</h3>
        <p>${request.job_description}</p>
      </div>

      <h3>What's Next?</h3>
      <ol>
        <li>Contact the vendors above to discuss your project</li>
        <li>Get quotes and compare</li>
        <li>Schedule the work</li>
        <li>After the job, leave a review to help other landlords!</li>
      </ol>

      <p style="margin-top: 24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" class="button">
          View in Dashboard
        </a>
      </p>
    `),
  };
}

// Introduction email to vendor about new job
export function vendorIntroEmail(
  request: ServiceRequest,
  vendor: Vendor
): { subject: string; html: string } {
  const serviceLabel = SERVICE_TYPE_LABELS[request.service_type] || request.service_type;
  const propertyTypeLabel = request.property_type ? PROPERTY_TYPE_LABELS[request.property_type] : null;
  const finishLevelLabel = request.finish_level ? FINISH_LEVEL_LABELS[request.finish_level] : null;
  const urgencyLabel = URGENCY_LABELS[request.urgency]?.split(' - ')[0] || request.urgency;

  // Build service details string if available
  const serviceDetailsHtml = request.service_details
    ? Object.entries(request.service_details)
        .map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
        .join('')
    : '';

  return {
    subject: `New Project Referral: ${serviceLabel} in ${request.property_location}`,
    html: emailWrapper(`
      <h2>New Project for You!</h2>
      <p>Hi ${vendor.contact_name},</p>
      <p>We have a new project for you from Real Landlording. Here are the details:</p>

      <div class="info-box">
        <h3 style="margin-top: 0;">🔥 Project Details</h3>
        <p><strong>Client Name:</strong> ${request.landlord_name || 'Not provided'}</p>
        ${request.landlord_phone ? `<p><strong>Client Phone:</strong> ${request.landlord_phone}</p>` : ''}
        <p><strong>Client Email:</strong> ${request.landlord_email}</p>
      </div>

      <div class="info-box">
        <h3 style="margin-top: 0;">Project Type</h3>
        <p><strong>Category:</strong> ${serviceLabel}</p>
        ${serviceDetailsHtml}
        ${finishLevelLabel ? `<p><strong>Finish Level:</strong> ${finishLevelLabel}</p>` : ''}
        ${propertyTypeLabel ? `<p><strong>Property Type:</strong> ${propertyTypeLabel}</p>` : ''}
        <p><strong>Property Address:</strong> ${request.property_address || request.property_location}</p>
        <p><strong>Timeline:</strong> ${urgencyLabel}</p>
        <p><strong>Project Description:</strong></p>
        <p>${request.job_description}</p>
      </div>

      <h3>✅ Next Steps</h3>
      <ul>
        <li><strong>Please contact the client as soon as possible</strong> to introduce yourself and discuss the project. Faster response significantly improves conversion.</li>
        <li>Provide a clear, written estimate outlining scope, pricing, and timeline.</li>
        <li>Be prepared to share references, experience, licensing, and insurance if requested.</li>
      </ul>

      <p>💡 <em>One of the most common frustrations clients report is lack of responsiveness. Clear communication and timely follow-through are often the deciding factors in winning the job and future referrals.</em></p>

      <h3>🚩 Reminders</h3>
      <p>Please remember that the client is responsible for vetting and making the final hiring decision. While we've made the connection, we encourage you to share any relevant certifications, insurance, and references to build their confidence in working with you.</p>

      <h3>📞 Need Assistance?</h3>
      <p>If you have any questions or need help during the process, feel free to reach out.</p>

      <p>Looking forward to seeing another successful project with your expertise!</p>

      <p style="margin-top: 24px;">
        Best regards,<br>
        <strong>Real Landlording</strong>
      </p>

      <p style="margin-top: 16px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/vendor/dashboard" class="button">
          View in Dashboard
        </a>
      </p>
    `),
  };
}

// Follow-up email to landlord after introduction
export function followUpEmail(
  request: ServiceRequest,
  vendorNames: string[]
): { subject: string; html: string } {
  const serviceLabel = SERVICE_TYPE_LABELS[request.service_type] || request.service_type;

  return {
    subject: `How did it go with your ${serviceLabel.toLowerCase()} vendors?`,
    html: emailWrapper(`
      <h2>Quick Check-In</h2>
      <p>Hi ${request.landlord_name || 'there'},</p>
      <p>A few days ago, we connected you with ${vendorNames.join(', ')} for your ${serviceLabel.toLowerCase()} request.</p>
      <p>We'd love to hear how it went!</p>

      <h3>Please take a moment to:</h3>
      <ul>
        <li>Let us know if you connected with the vendors</li>
        <li>Leave a review if you hired one of them</li>
        <li>Tell us if you need different recommendations</li>
      </ul>

      <p style="margin-top: 24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" class="button">
          Leave a Review
        </a>
      </p>

      <p>Your feedback helps us match landlords with the best vendors!</p>
    `),
  };
}

// Email when vendor submits an application
export function vendorApplicationReceivedEmail(vendor: { contact_name: string; business_name: string; email: string }): { subject: string; html: string } {
  return {
    subject: 'Application Received - Real Landlording Vendor Network',
    html: emailWrapper(`
      <h2>Thank You for Applying!</h2>
      <p>Hi ${vendor.contact_name},</p>
      <p>Thank you for submitting your request to join the Real Landlording Vendor Network!</p>
      <p>We're excited to learn more about your services and how you can help landlords in the Philadelphia area.</p>
      <p>Our team is currently reviewing your application. We'll be in touch soon with next steps, but if you have any questions in the meantime, feel free to reply to this email.</p>

      <h3>What happens next?</h3>
      <ul>
        <li><strong>✔ Application Review:</strong> We'll assess your submission and may reach out for additional details.</li>
        <li><strong>✔ Approval & Onboarding:</strong> Once approved, we'll provide guidance on how to maximize your success.</li>
        <li><strong>✔ Start Getting Matched:</strong> After onboarding, landlords will be able to find and connect with your business through our platform.</li>
      </ul>

      <p>We appreciate your interest and look forward to working with you!</p>

      <p style="margin-top: 24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.reallandlording.com'}/vendor/login" class="button">
          Vendor Portal
        </a>
      </p>

      <p style="margin-top: 24px;">
        Best,<br>
        <strong>Real Landlording LLC</strong><br>
        <a href="https://reallandlording.com">https://reallandlording.com</a>
      </p>
    `),
  };
}

// Welcome email for approved vendors
export function vendorWelcomeEmail(
  vendor: Vendor,
  tempPassword?: string
): { subject: string; html: string } {
  return {
    subject: 'Welcome to Real Landlording Vendor Network!',
    html: emailWrapper(`
      <h2>You're Approved!</h2>
      <p>Hi ${vendor.contact_name},</p>
      <p>Great news! Your application to join the Real Landlording vendor network has been approved.</p>
      <p>You'll now receive job referrals from our community of 2,900+ Philadelphia landlords.</p>

      ${
        tempPassword
          ? `
        <div class="info-box">
          <h3 style="margin-top: 0;">Your Login Credentials</h3>
          <p><strong>Email:</strong> ${vendor.email}</p>
          <p><strong>Temporary Password:</strong> ${tempPassword}</p>
          <p><em>Please change your password after logging in.</em></p>
        </div>
      `
          : ''
      }

      <h3>What's Next?</h3>
      <ul>
        <li>Log in to your vendor dashboard</li>
        <li>Review your profile and service areas</li>
        <li>Wait for job referrals - we'll email you when there's a match!</li>
        <li>Respond to referrals within 24 hours for best results</li>
      </ul>

      <p style="margin-top: 24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/vendor/login" class="button">
          Log In to Dashboard
        </a>
      </p>
    `),
  };
}

// Rejection email for vendors
export function vendorRejectedEmail(vendor: Vendor): { subject: string; html: string } {
  return {
    subject: 'Real Landlording Application Update',
    html: emailWrapper(`
      <h2>Application Status Update</h2>
      <p>Hi ${vendor.contact_name},</p>
      <p>Thank you for your interest in joining the Real Landlording vendor network.</p>
      <p>After reviewing your application, we've decided not to move forward at this time. This decision may be based on various factors including service area coverage, current vendor capacity, or qualification requirements.</p>

      <h3>What You Can Do</h3>
      <ul>
        <li>Reply to this email if you have questions or additional information to share</li>
        <li>Reapply in 3-6 months if your situation changes</li>
        <li>Ensure you have proper licensing and insurance for future applications</li>
      </ul>

      <p>We appreciate your interest and wish you success with your business.</p>
    `),
  };
}

// Email when no vendors are matched for a request
export function noVendorMatchedEmail(request: ServiceRequest): { subject: string; html: string } {
  const serviceLabel = SERVICE_TYPE_LABELS[request.service_type] || request.service_type;

  return {
    subject: `Update on Your ${serviceLabel} Request`,
    html: emailWrapper(`
      <h2>Update on Your Request</h2>
      <p>Dear ${request.landlord_name || 'Landlord'},</p>
      <p>Thank you for submitting your project request to Real Landlording.</p>
      <p>We've reviewed your request and want to be transparent: at this early stage, our vetted network doesn't yet cover every service type landlords may need. Your request falls into an area we're actively working to build out.</p>
      <p><strong>That said, this is exactly how Real Landlording grows.</strong></p>
      <p>Every request helps us identify where landlords need reliable solutions most, and we're continuously sourcing, vetting, and onboarding new professionals to fill those gaps. Your submission is now part of that prioritization.</p>

      <h3>✅ What's next?</h3>
      <ul>
        <li>If we identify a qualified provider that meets our standards, we'll connect you directly.</li>
        <li>If we're not able to make a match right away, we'll keep your request on file as we expand into this service area.</li>
        <li>You're always welcome to update your request or reach out if your timeline changes.</li>
      </ul>

      <p>Our goal isn't to offer every vendor — it's to offer the right ones. We appreciate your patience as we build this the right way, with landlords' long-term interests in mind.</p>
      <p>Thank you for trusting Real Landlording with your request.</p>

      <p style="margin-top: 24px;">
        Warm regards,<br>
        <strong>Real Landlording</strong>
      </p>
    `),
  };
}

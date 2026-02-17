/**
 * Tests that email templates properly escape user input to prevent XSS.
 *
 * These tests verify that user-provided fields (landlord_name, job_description,
 * business_name, contact_name, etc.) are HTML-escaped in template output.
 *
 * NOTE: These tests will FAIL until Phase 2 applies escapeHtml() to templates.
 * This is intentional TDD — write failing tests first, then fix the code.
 */

import {
  requestReceivedEmail,
  landlordIntroEmail,
  vendorIntroEmail,
  followUpEmail,
  vendorApplicationReceivedEmail,
  vendorWelcomeEmail,
} from '@/lib/email/templates';
import { ServiceRequest, Vendor } from '@/types/database';
import { createTestServiceRequest, createTestVendor } from '@/__tests__/utils/test-helpers';

// Test helpers return partial objects; cast to the full types for template functions
function testRequest(overrides?: Record<string, unknown>): ServiceRequest {
  return createTestServiceRequest(overrides) as unknown as ServiceRequest;
}
function testVendor(overrides?: Record<string, unknown>): Vendor {
  return createTestVendor(overrides) as unknown as Vendor;
}

const XSS_PAYLOAD = '<script>alert("xss")</script>';
const XSS_IMG_PAYLOAD = '<img src=x onerror="alert(1)">';

describe('Email Template Security', () => {
  describe('requestReceivedEmail', () => {
    it('should escape landlord_name', () => {
      const request = testRequest({ landlord_name: XSS_PAYLOAD });
      const { html } = requestReceivedEmail(request);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should escape job_description', () => {
      const request = testRequest({ job_description: XSS_PAYLOAD });
      const { html } = requestReceivedEmail(request);

      expect(html).not.toContain('<script>alert');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should escape property_location', () => {
      const request = testRequest({ property_location: XSS_IMG_PAYLOAD });
      const { html } = requestReceivedEmail(request);

      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;img');
    });
  });

  describe('landlordIntroEmail', () => {
    it('should escape landlord_name', () => {
      const request = testRequest({ landlord_name: XSS_PAYLOAD });
      const vendors = [testVendor()];
      const { html } = landlordIntroEmail(request, vendors);

      expect(html).not.toContain('<script>alert');
    });

    it('should escape vendor business_name', () => {
      const request = testRequest();
      const vendors = [testVendor({ business_name: XSS_PAYLOAD })];
      const { html } = landlordIntroEmail(request, vendors);

      expect(html).not.toContain('<script>alert');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should escape vendor contact_name', () => {
      const request = testRequest();
      const vendors = [testVendor({ contact_name: XSS_IMG_PAYLOAD })];
      const { html } = landlordIntroEmail(request, vendors);

      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;img');
    });

    it('should escape vendor email', () => {
      const request = testRequest();
      const vendors = [testVendor({ email: '"><script>alert(1)</script>' })];
      const { html } = landlordIntroEmail(request, vendors);

      expect(html).not.toContain('<script>alert');
    });

    it('should escape job_description in the request box', () => {
      const request = testRequest({ job_description: XSS_PAYLOAD });
      const vendors = [testVendor()];
      const { html } = landlordIntroEmail(request, vendors);

      expect(html).not.toContain('<script>alert');
    });
  });

  describe('vendorIntroEmail', () => {
    it('should escape vendor contact_name', () => {
      const request = testRequest();
      const vendor = testVendor({ contact_name: XSS_PAYLOAD });
      const { html } = vendorIntroEmail(request, vendor);

      expect(html).not.toContain('<script>alert');
    });

    it('should escape landlord_name', () => {
      const request = testRequest({ landlord_name: XSS_PAYLOAD });
      const vendor = testVendor();
      const { html } = vendorIntroEmail(request, vendor);

      expect(html).not.toContain('<script>alert');
    });

    it('should escape landlord_email', () => {
      const request = testRequest({ landlord_email: '"><script>alert(1)</script>' });
      const vendor = testVendor();
      const { html } = vendorIntroEmail(request, vendor);

      expect(html).not.toContain('<script>alert');
    });

    it('should escape landlord_phone', () => {
      const request = testRequest({ landlord_phone: '<script>alert(1)</script>' });
      const vendor = testVendor();
      const { html } = vendorIntroEmail(request, vendor);

      expect(html).not.toContain('<script>alert');
    });

    it('should escape job_description', () => {
      const request = testRequest({ job_description: XSS_PAYLOAD });
      const vendor = testVendor();
      const { html } = vendorIntroEmail(request, vendor);

      expect(html).not.toContain('<script>alert');
    });

    it('should escape property_address', () => {
      const request = testRequest({ property_address: XSS_IMG_PAYLOAD });
      const vendor = testVendor();
      const { html } = vendorIntroEmail(request, vendor);

      expect(html).not.toContain('<img src=x');
    });
  });

  describe('followUpEmail', () => {
    it('should escape landlord_name', () => {
      const request = testRequest({ landlord_name: XSS_PAYLOAD });
      const { html } = followUpEmail(request, ['Good Plumber LLC']);

      expect(html).not.toContain('<script>alert');
    });

    it('should escape vendor names', () => {
      const request = testRequest();
      const { html } = followUpEmail(request, [XSS_PAYLOAD, 'Good Vendor']);

      expect(html).not.toContain('<script>alert');
    });
  });

  describe('vendorApplicationReceivedEmail', () => {
    it('should escape contact_name', () => {
      const vendor = { contact_name: XSS_PAYLOAD, business_name: 'Test LLC', email: 'test@test.com' };
      const { html } = vendorApplicationReceivedEmail(vendor);

      expect(html).not.toContain('<script>alert');
    });
  });

  describe('vendorWelcomeEmail', () => {
    it('should escape vendor contact_name', () => {
      const vendor = testVendor({ contact_name: XSS_PAYLOAD });
      const { html } = vendorWelcomeEmail(vendor);

      expect(html).not.toContain('<script>alert');
    });

    it('should escape vendor email', () => {
      const vendor = testVendor({ email: '"><script>alert(1)</script>' });
      const { html } = vendorWelcomeEmail(vendor);

      expect(html).not.toContain('<script>alert');
    });

    it('should escape temp password', () => {
      const vendor = testVendor();
      const { html } = vendorWelcomeEmail(vendor, '<script>alert(1)</script>');

      expect(html).not.toContain('<script>alert');
    });
  });

  describe('combined XSS vectors', () => {
    it('should handle multiple XSS payloads in the same request', () => {
      const request = testRequest({
        landlord_name: XSS_PAYLOAD,
        job_description: XSS_IMG_PAYLOAD,
        property_location: '"><script>document.cookie</script>',
      });
      const { html } = requestReceivedEmail(request);

      // No raw script tags should appear anywhere
      expect(html).not.toMatch(/<script[^>]*>.*?<\/script>/i);
      // Angle brackets are escaped, neutralizing HTML injection
      expect(html).not.toContain('<img src=x');
    });
  });
});

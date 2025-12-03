/**
 * One-time script to import vendors from WordPress CSV export
 * Run with: npx ts-node --esm scripts/import-vendors.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Map WordPress vendor types to our ServiceType
const SERVICE_TYPE_MAP: Record<string, string> = {
  'cleaning-clean-out-services': 'clean_out',
  'lead-testing': 'lead_testing',
  'boost-my-skills': 'training',
  'locksmith-security': 'locksmith_security',
  'compliance': 'compliance_legal_tax',
  'legal_services': 'compliance_legal_tax',
  'accounting': 'compliance_legal_tax',
  'consulting': 'compliance_legal_tax',
  'maintenance': 'maintenance',
  'electrician': 'electrician',
  'move-ins': 'move_ins',
  'exterior-contractor-fencing-siding-cement-etc': 'exterior_contractor',
  'painter': 'painter',
  'gc': 'general_contractor',
  'pest-control': 'pest_control',
  'handyman': 'handyman',
  'plumber': 'plumber',
  'hvac': 'hvac',
  'roofer': 'roofer',
  'windows-doors': 'windows_doors',
  'inspections': 'maintenance',
  'materials': 'maintenance',
};

interface ParsedVendor {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  location: string;
  vendorTypes: string[];
  otherVendorType: string;
  contactPreference: string;
  experienceYears: string;
  insured: boolean;
  rentalExperience: boolean;
  serviceAreas: string;
  comments: string;
  status: 'publish' | 'draft';
}

function parsePostContent(content: string): Partial<ParsedVendor> {
  const result: Partial<ParsedVendor> = {};

  // Clean up HTML tags and entities
  content = content
    .replace(/<!--more-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#038;/g, '&')
    .replace(/<span[^>]*>/g, '')
    .replace(/<\/span>/g, '')
    .trim();

  // Parse each field
  const patterns: Record<string, RegExp> = {
    businessName: /Business Name:\s*(.+?)(?:\n|$)/i,
    contactName: /Name:\s*(.+?)(?:\n|$)/i,
    email: /Email:\s*(.+?)(?:\n|$)/i,
    phone: /Phone:\s*(.+?)(?:\n|$)/i,
    website: /Web:\s*(.+?)(?:\n|$)/i,
    location: /Business Location:\s*(.+?)(?:\n|$)/i,
    vendorType: /Vendor Type:\s*(.+?)(?:\n|$)/i,
    otherVendorType: /Other Vendor Type:\s*(.+?)(?:\n|$)/i,
    contactPreference: /Contact Preference:\s*(.+?)(?:\n|$)/i,
    experienceYears: /Expiriance Year:\s*(.+?)(?:\n|$)|Experience Year:\s*(.+?)(?:\n|$)/i,
    insuredStatus: /Insured Status:\s*(.+?)(?:\n|$)/i,
    experienceStatus: /Expiriance Status:\s*(.+?)(?:\n|$)|Experience Status:\s*(.+?)(?:\n|$)/i,
    areas: /Areas:\s*(.+?)(?:\n|$)/i,
    comments: /Comments:\s*(.+?)(?:\n|Read term:|$)/is,
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = content.match(pattern);
    if (match) {
      const value = (match[1] || match[2] || '').trim();
      if (value && value !== 'Not provided') {
        switch (key) {
          case 'businessName':
            result.businessName = value;
            break;
          case 'contactName':
            result.contactName = value;
            break;
          case 'email':
            // Clean email (remove any HTML remnants)
            result.email = value.replace(/<[^>]*>/g, '').trim();
            break;
          case 'phone':
            result.phone = value.replace(/[^\d\-+() ]/g, '');
            break;
          case 'website':
            result.website = value.startsWith('http') ? value : `https://${value}`;
            break;
          case 'location':
            result.location = value;
            break;
          case 'vendorType':
            result.vendorTypes = value.split(',').map(t => t.trim().toLowerCase());
            break;
          case 'otherVendorType':
            result.otherVendorType = value;
            break;
          case 'contactPreference':
            result.contactPreference = value;
            break;
          case 'experienceYears':
            result.experienceYears = value;
            break;
          case 'insuredStatus':
            result.insured = value.toUpperCase() === 'YES';
            break;
          case 'experienceStatus':
            result.rentalExperience = value.toUpperCase() === 'YES';
            break;
          case 'areas':
            result.serviceAreas = value;
            break;
          case 'comments':
            result.comments = value.trim();
            break;
        }
      }
    }
  }

  return result;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

async function importVendors() {
  const csvPath = '/Users/alsade/Downloads/b8px_posts.csv';
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  // Better CSV parsing: track quote state properly
  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < fileContent.length) {
    const char = fileContent[i];
    const nextChar = fileContent[i + 1];

    if (char === '"') {
      if (!inQuotes) {
        // Starting a quoted field
        inQuotes = true;
      } else if (nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++;
      } else {
        // End of quoted field
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      currentRecord.push(currentField);
      currentField = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      // Record separator
      currentRecord.push(currentField);
      if (currentRecord.some(f => f.trim())) {
        records.push(currentRecord);
      }
      currentRecord = [];
      currentField = '';
      if (char === '\r') i++;
    } else if (char !== '\r') {
      currentField += char;
    }
    i++;
  }

  // Don't forget the last record
  if (currentField || currentRecord.length > 0) {
    currentRecord.push(currentField);
    if (currentRecord.some(f => f.trim())) {
      records.push(currentRecord);
    }
  }

  console.log(`Found ${records.length} records in CSV\n`);

  const vendors: any[] = [];
  const skipped: string[] = [];

  for (const columns of records) {
    // CSV columns: id, author, date, date_gmt, content, title, excerpt, status, ...
    const [id, author, date, dateGmt, postContent, title, excerpt, status] = columns;

    // Skip if not a vendor post or empty content
    if (!postContent || postContent.trim() === '' || postContent === ',') {
      skipped.push(`ID ${id}: Empty content`);
      continue;
    }

    // Parse the post content
    const parsed = parsePostContent(postContent);

    // Skip if missing critical fields
    if (!parsed.email || !parsed.businessName) {
      skipped.push(`ID ${id}: Missing email or business name`);
      continue;
    }

    // Map vendor types to our service types
    const services: string[] = [];
    const unmappedTypes: string[] = [];

    if (parsed.vendorTypes) {
      for (const vType of parsed.vendorTypes) {
        const mapped = SERVICE_TYPE_MAP[vType];
        if (mapped && !services.includes(mapped)) {
          services.push(mapped);
        } else if (!mapped && vType !== 'other') {
          unmappedTypes.push(vType);
        }
      }
    }

    // Determine status: publish = active, draft = pending_review
    const vendorStatus = status === 'publish' ? 'active' : 'pending_review';

    // Build service areas array
    const serviceAreas = parsed.serviceAreas
      ? parsed.serviceAreas.split(/[,&]/).map(a => a.trim()).filter(Boolean)
      : ['Philadelphia'];

    // Build qualifications from experience
    let qualifications = '';
    if (parsed.experienceYears) {
      qualifications = `${parsed.experienceYears} years experience`;
    }

    // Build other services text
    let servicesOther = '';
    if (parsed.otherVendorType) {
      servicesOther = parsed.otherVendorType;
    }
    if (unmappedTypes.length > 0) {
      servicesOther += (servicesOther ? ', ' : '') + unmappedTypes.join(', ');
    }

    const vendor = {
      status: vendorStatus,
      contact_name: parsed.contactName || title || 'Unknown',
      email: parsed.email.toLowerCase(),
      phone: parsed.phone || null,
      business_name: parsed.businessName,
      website: parsed.website || null,
      location: parsed.location || 'Philadelphia',
      services: services.length > 0 ? services : ['handyman'], // Default to handyman if no mapping
      services_other: servicesOther || null,
      qualifications: qualifications || null,
      licensed: false, // CSV doesn't have licensed field, default false
      insured: parsed.insured ?? false,
      rental_experience: parsed.rentalExperience ?? false,
      service_areas: serviceAreas,
      call_preferences: parsed.contactPreference || null,
      portfolio_media: null,
      performance_score: 0,
      total_reviews: 0,
      admin_notes: parsed.comments || null,
      terms_accepted: true,
      terms_accepted_at: date || new Date().toISOString(),
    };

    vendors.push(vendor);
  }

  console.log(`Parsed ${vendors.length} vendors for import`);
  console.log(`Skipped ${skipped.length} records:\n`);
  skipped.forEach(s => console.log(`  - ${s}`));
  console.log('');

  // Check for duplicate emails
  const emailCounts: Record<string, number> = {};
  for (const v of vendors) {
    emailCounts[v.email] = (emailCounts[v.email] || 0) + 1;
  }
  const duplicates = Object.entries(emailCounts).filter(([, count]) => count > 1);
  if (duplicates.length > 0) {
    console.log('Duplicate emails found (will keep first):');
    duplicates.forEach(([email, count]) => console.log(`  - ${email}: ${count} times`));
    console.log('');
  }

  // Dedupe by email (keep first occurrence)
  const seen = new Set<string>();
  const uniqueVendors = vendors.filter(v => {
    if (seen.has(v.email)) return false;
    seen.add(v.email);
    return true;
  });

  console.log(`Importing ${uniqueVendors.length} unique vendors...\n`);

  // Import in batches
  const batchSize = 10;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < uniqueVendors.length; i += batchSize) {
    const batch = uniqueVendors.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('vendors')
      .upsert(batch, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error(`Batch ${i / batchSize + 1} error:`, error.message);
      errors += batch.length;

      // Try inserting one by one to see which fails
      for (const vendor of batch) {
        const { error: singleError } = await supabase
          .from('vendors')
          .upsert(vendor, { onConflict: 'email' });

        if (singleError) {
          console.error(`  Failed: ${vendor.email} - ${singleError.message}`);
        } else {
          imported++;
          errors--;
        }
      }
    } else {
      imported += data?.length || batch.length;
      console.log(`Imported batch ${Math.floor(i / batchSize) + 1}: ${batch.map(v => v.business_name).join(', ')}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`Import complete!`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Errors: ${errors}`);
  console.log(`========================================\n`);
}

importVendors().catch(console.error);

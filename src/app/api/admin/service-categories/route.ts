import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';
import { invalidateServiceTaxonomyCache } from '@/lib/serviceTaxonomy';

export async function GET() {
  const auth = await verifyAdmin();
  if (!auth.success) return auth.response;
  const { adminClient } = auth.context;

  // Fetch all categories (including inactive) with usage counts
  const { data: categories, error } = await adminClient
    .from('service_categories')
    .select('*')
    .order('group_key')
    .order('sort_order');

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  // Get usage counts for each category key
  const keys = (categories ?? []).map((c) => c.key);

  // Count vendors using each service (vendors.services is TEXT[])
  const { data: vendorCounts } = await adminClient.rpc('count_vendors_per_service', {});

  // Count requests per service type
  const { data: requestCounts } = await adminClient
    .from('service_requests')
    .select('service_type');

  const vendorCountMap: Record<string, number> = {};
  const requestCountMap: Record<string, number> = {};

  if (vendorCounts) {
    for (const row of vendorCounts) {
      vendorCountMap[row.service] = Number(row.count);
    }
  }

  if (requestCounts) {
    for (const row of requestCounts) {
      requestCountMap[row.service_type] = (requestCountMap[row.service_type] || 0) + 1;
    }
  }

  const categoriesWithCounts = (categories ?? []).map((c) => ({
    ...c,
    vendor_count: vendorCountMap[c.key] || 0,
    request_count: requestCountMap[c.key] || 0,
  }));

  return NextResponse.json({ categories: categoriesWithCounts });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth.success) return auth.response;
  const { adminClient } = auth.context;

  const body = await request.json();
  const {
    label,
    group_key,
    classifications = [],
    emergency_enabled = false,
    finish_level_enabled = false,
    external_link = false,
    external_url = null,
    search_keywords = [],
  } = body;

  if (!label || !group_key) {
    return NextResponse.json(
      { message: 'label and group_key are required' },
      { status: 400 }
    );
  }

  // Auto-generate key from label
  const key = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  if (!key) {
    return NextResponse.json(
      { message: 'Could not generate a valid key from label' },
      { status: 400 }
    );
  }

  // Check key uniqueness
  const { data: existing } = await adminClient
    .from('service_categories')
    .select('id')
    .eq('key', key)
    .single();

  if (existing) {
    return NextResponse.json(
      { message: `A category with key "${key}" already exists` },
      { status: 409 }
    );
  }

  // Determine sort_order (append to end of group)
  const { data: lastInGroup } = await adminClient
    .from('service_categories')
    .select('sort_order')
    .eq('group_key', group_key)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const sort_order = (lastInGroup?.sort_order ?? 0) + 1;

  const { data: created, error } = await adminClient
    .from('service_categories')
    .insert({
      key,
      label,
      group_key,
      sort_order,
      classifications,
      emergency_enabled,
      finish_level_enabled,
      external_link,
      external_url,
      search_keywords,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  invalidateServiceTaxonomyCache();
  return NextResponse.json(created, { status: 201 });
}

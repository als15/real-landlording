import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';
import { invalidateServiceTaxonomyCache } from '@/lib/serviceTaxonomy';

export async function GET() {
  const auth = await verifyAdmin();
  if (!auth.success) return auth.response;
  const { adminClient } = auth.context;

  const { data, error } = await adminClient
    .from('service_category_groups')
    .select('*')
    .order('sort_order');

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ groups: data });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth.success) return auth.response;
  const { adminClient } = auth.context;

  const body = await request.json();
  const { label } = body;

  if (!label) {
    return NextResponse.json({ message: 'label is required' }, { status: 400 });
  }

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

  // Check uniqueness
  const { data: existing } = await adminClient
    .from('service_category_groups')
    .select('id')
    .eq('key', key)
    .single();

  if (existing) {
    return NextResponse.json(
      { message: `A group with key "${key}" already exists` },
      { status: 409 }
    );
  }

  // Determine sort_order
  const { data: lastGroup } = await adminClient
    .from('service_category_groups')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const sort_order = (lastGroup?.sort_order ?? 0) + 1;

  const { data: created, error } = await adminClient
    .from('service_category_groups')
    .insert({ key, label, sort_order })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  invalidateServiceTaxonomyCache();
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  // Bulk reorder groups
  const auth = await verifyAdmin();
  if (!auth.success) return auth.response;
  const { adminClient } = auth.context;

  const body = await request.json();
  const { items } = body as { items: { id: string; sort_order: number }[] };

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { message: 'items array is required' },
      { status: 400 }
    );
  }

  const updates = items.map(({ id, sort_order }) =>
    adminClient
      .from('service_category_groups')
      .update({ sort_order })
      .eq('id', id)
  );

  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error);
  if (firstError?.error) {
    return NextResponse.json({ message: firstError.error.message }, { status: 500 });
  }

  invalidateServiceTaxonomyCache();
  return NextResponse.json({ success: true });
}

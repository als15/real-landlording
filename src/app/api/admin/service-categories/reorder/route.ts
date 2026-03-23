import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';
import { invalidateServiceTaxonomyCache } from '@/lib/serviceTaxonomy';

export async function PATCH(request: NextRequest) {
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

  // Update sort_order for each item
  const updates = items.map(({ id, sort_order }) =>
    adminClient
      .from('service_categories')
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

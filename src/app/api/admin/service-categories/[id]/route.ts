import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';
import { invalidateServiceTaxonomyCache } from '@/lib/serviceTaxonomy';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin();
  if (!auth.success) return auth.response;
  const { adminClient } = auth.context;
  const { id } = await params;

  const body = await request.json();

  // key cannot be changed after creation
  delete body.key;
  delete body.id;
  delete body.created_at;
  delete body.updated_at;

  const { data, error } = await adminClient
    .from('service_categories')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ message: 'Category not found' }, { status: 404 });
  }

  invalidateServiceTaxonomyCache();
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin();
  if (!auth.success) return auth.response;
  const { adminClient } = auth.context;
  const { id } = await params;

  // Soft delete: set is_active = false
  const { data, error } = await adminClient
    .from('service_categories')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ message: 'Category not found' }, { status: 404 });
  }

  invalidateServiceTaxonomyCache();
  return NextResponse.json(data);
}

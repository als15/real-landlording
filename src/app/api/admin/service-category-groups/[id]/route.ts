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
    .from('service_category_groups')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ message: 'Group not found' }, { status: 404 });
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

  // Check if group has active categories
  const { data: group } = await adminClient
    .from('service_category_groups')
    .select('key')
    .eq('id', id)
    .single();

  if (!group) {
    return NextResponse.json({ message: 'Group not found' }, { status: 404 });
  }

  const { count } = await adminClient
    .from('service_categories')
    .select('id', { count: 'exact', head: true })
    .eq('group_key', group.key)
    .eq('is_active', true);

  if (count && count > 0) {
    return NextResponse.json(
      { message: `Cannot delete group with ${count} active categories. Move or deactivate them first.` },
      { status: 400 }
    );
  }

  // Soft delete
  const { data, error } = await adminClient
    .from('service_category_groups')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  invalidateServiceTaxonomyCache();
  return NextResponse.json(data);
}

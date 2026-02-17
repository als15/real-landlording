import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';

export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = adminClient
      .from('landlords')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Server-side search across multiple fields
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.or(
        `email.ilike.${searchTerm},name.ilike.${searchTerm},phone.ilike.${searchTerm}`
      );
    }

    // Apply pagination after filters
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching landlords:', error);
      return NextResponse.json(
        { message: 'Failed to fetch landlords' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, count });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

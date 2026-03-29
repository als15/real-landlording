import { NextResponse } from 'next/server';
import { getServiceCategories, getServiceCategoryGroups } from '@/lib/serviceTaxonomy';

export async function GET() {
  try {
    const [categories, groups] = await Promise.all([
      getServiceCategories(),
      getServiceCategoryGroups(),
    ]);

    return NextResponse.json(
      { categories, groups },
      {
        headers: {
          'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Failed to fetch service categories:', error);
    return NextResponse.json(
      { message: 'Failed to fetch service categories' },
      { status: 500 }
    );
  }
}

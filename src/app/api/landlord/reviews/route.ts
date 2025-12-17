import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateVendorScore } from '@/lib/scoring';

export async function POST(request: NextRequest) {
  try {
    const { match_id, rating, quality, price, timeline, treatment, review_text } = await request.json();

    if (!match_id || !rating) {
      return NextResponse.json(
        { message: 'Match ID and rating are required' },
        { status: 400 }
      );
    }

    // Validate rating values (1-5 range)
    const validateRating = (value: number | null | undefined, name: string) => {
      if (value !== null && value !== undefined && (value < 1 || value > 5)) {
        return `${name} must be between 1 and 5`;
      }
      return null;
    };

    const ratingError = validateRating(rating, 'Rating');
    if (ratingError) {
      return NextResponse.json({ message: ratingError }, { status: 400 });
    }

    for (const [value, name] of [
      [quality, 'Quality'],
      [price, 'Price'],
      [timeline, 'Timeline'],
      [treatment, 'Treatment'],
    ] as const) {
      const error = validateRating(value, name);
      if (error) {
        return NextResponse.json({ message: error }, { status: 400 });
      }
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the match and verify ownership through the request
    const { data: match, error: matchError } = await supabase
      .from('request_vendor_matches')
      .select(`
        *,
        request:service_requests(landlord_email, landlord_id)
      `)
      .eq('id', match_id)
      .single();

    if (matchError || !match) {
      return NextResponse.json(
        { message: 'Match not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    const { data: landlord } = await supabase
      .from('landlords')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    const serviceRequest = match.request as { landlord_email: string; landlord_id: string | null };
    const isOwner =
      serviceRequest.landlord_email === user.email ||
      (landlord && serviceRequest.landlord_id === landlord.id);

    if (!isOwner) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update the match with the review
    const { error: updateError } = await supabase
      .from('request_vendor_matches')
      .update({
        review_rating: rating,
        review_quality: quality || null,
        review_price: price || null,
        review_timeline: timeline || null,
        review_treatment: treatment || null,
        review_text: review_text || null,
        review_submitted_at: new Date().toISOString(),
        job_completed: true,
      })
      .eq('id', match_id);

    if (updateError) {
      console.error('Error updating review:', updateError);
      return NextResponse.json(
        { message: 'Failed to submit review' },
        { status: 500 }
      );
    }

    // Update vendor's performance score (async, don't block response)
    updateVendorScore(supabase, match.vendor_id).catch(err => {
      console.error('Error updating vendor score:', err);
    });

    return NextResponse.json({ message: 'Review submitted successfully' });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

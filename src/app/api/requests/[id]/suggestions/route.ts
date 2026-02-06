/**
 * Smart Matching Suggestions API
 *
 * GET /api/requests/[id]/suggestions
 *
 * Returns vendor suggestions with match scores for a service request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';
import {
  calculateMatchScores,
  createMatchingContext,
  enrichVendorWithMatchData,
  getScoringMeta,
} from '@/lib/matching';
import type { VendorMatchData, SuggestionsResponse } from '@/lib/matching';
import type { Vendor, ServiceRequest } from '@/types/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;

    const { id } = await params;

    // Get the service request
    const { data: serviceRequest, error: requestError } = await adminClient
      .from('service_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (requestError || !serviceRequest) {
      return NextResponse.json(
        { message: 'Request not found' },
        { status: 404 }
      );
    }

    // Get all active vendors
    const { data: vendors, error: vendorsError } = await adminClient
      .from('vendors')
      .select('*')
      .eq('status', 'active');

    if (vendorsError) {
      return NextResponse.json(
        { message: 'Failed to fetch vendors', error: vendorsError.message },
        { status: 500 }
      );
    }

    if (!vendors || vendors.length === 0) {
      return NextResponse.json({
        request: {
          id: serviceRequest.id,
          service_type: serviceRequest.service_type,
          property_location: serviceRequest.property_location,
          zip_code: serviceRequest.zip_code,
          urgency: serviceRequest.urgency,
        },
        suggestions: [],
        otherVendors: [],
        meta: {
          totalEligible: 0,
          totalRecommended: 0,
          averageScore: 0,
          scoringVersion: '1.0.0',
        },
      } as SuggestionsResponse);
    }

    // Get match metrics for vendors (pending jobs, response times)
    const vendorIds = vendors.map((v: Vendor) => v.id);

    // Get pending jobs count for each vendor
    const { data: pendingMatches } = await adminClient
      .from('request_vendor_matches')
      .select('vendor_id')
      .in('vendor_id', vendorIds)
      .in('status', ['pending', 'intro_sent', 'vendor_accepted', 'in_progress']);

    // Count pending jobs per vendor
    const pendingJobsCounts: Record<string, number> = {};
    pendingMatches?.forEach((match: { vendor_id: string }) => {
      pendingJobsCounts[match.vendor_id] = (pendingJobsCounts[match.vendor_id] || 0) + 1;
    });

    // Get average response times for vendors
    const { data: responseData } = await adminClient
      .from('request_vendor_matches')
      .select('vendor_id, response_time_seconds')
      .in('vendor_id', vendorIds)
      .not('response_time_seconds', 'is', null);

    // Calculate average response time per vendor
    const responseTimes: Record<string, { total: number; count: number }> = {};
    responseData?.forEach((match: { vendor_id: string; response_time_seconds: number }) => {
      if (!responseTimes[match.vendor_id]) {
        responseTimes[match.vendor_id] = { total: 0, count: 0 };
      }
      responseTimes[match.vendor_id].total += match.response_time_seconds;
      responseTimes[match.vendor_id].count += 1;
    });

    const avgResponseTimes: Record<string, number> = {};
    Object.entries(responseTimes).forEach(([vendorId, data]) => {
      avgResponseTimes[vendorId] = (data.total / data.count) / 3600; // Convert to hours
    });

    // Enrich vendors with match data
    const enrichedVendors: VendorMatchData[] = vendors.map((vendor: Vendor) =>
      enrichVendorWithMatchData(vendor, {
        pendingJobsCount: pendingJobsCounts[vendor.id] || 0,
        avgResponseTimeHours: avgResponseTimes[vendor.id] ?? null,
      })
    );

    // Create matching context from request
    const context = createMatchingContext(serviceRequest as ServiceRequest);

    // Calculate match scores for all vendors
    const scoredVendors = calculateMatchScores(enrichedVendors, context);

    // Split into suggestions (recommended) and others
    const suggestions = scoredVendors.filter(v => v.matchScore.recommended);
    const otherVendors = scoredVendors.filter(v => !v.matchScore.recommended);

    // Get scoring metadata
    const meta = getScoringMeta(scoredVendors);

    const response: SuggestionsResponse = {
      request: {
        id: serviceRequest.id,
        service_type: serviceRequest.service_type,
        property_location: serviceRequest.property_location,
        zip_code: serviceRequest.zip_code,
        urgency: serviceRequest.urgency,
      },
      suggestions,
      otherVendors,
      meta,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Suggestions API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

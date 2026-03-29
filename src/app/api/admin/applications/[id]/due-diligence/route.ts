import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';
import { isOpenAIConfigured, runDueDiligenceAnalysis } from '@/lib/openai';

export const maxDuration = 120;

// GET - Fetch all due diligence reports for a vendor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;
    const { id } = await params;

    const { data, error } = await adminClient
      .from('vendor_due_diligence')
      .select('*')
      .eq('vendor_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching due diligence reports:', error);
      return NextResponse.json(
        { message: 'Failed to fetch reports' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Trigger a new due diligence analysis
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient, userId } = adminResult.context;
    const { id } = await params;

    // Check OpenAI configuration
    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        { message: 'OpenAI is not configured. Set the OPENAI_API_KEY environment variable.' },
        { status: 503 }
      );
    }

    // Fetch vendor
    const { data: vendor, error: vendorError } = await adminClient
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    if (vendorError || !vendor) {
      return NextResponse.json(
        { message: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Look up admin_users.id from auth user id
    const { data: adminUser } = await adminClient
      .from('admin_users')
      .select('id')
      .eq('auth_user_id', userId)
      .single();

    // Insert pending row
    const { data: report, error: insertError } = await adminClient
      .from('vendor_due_diligence')
      .insert({
        vendor_id: id,
        status: 'running',
        triggered_by: adminUser?.id || null,
      })
      .select()
      .single();

    if (insertError || !report) {
      console.error('Error creating due diligence report:', insertError);
      return NextResponse.json(
        { message: 'Failed to create report' },
        { status: 500 }
      );
    }

    // Run analysis
    const result = await runDueDiligenceAnalysis(vendor);

    if (result.success) {
      // Update with results
      const { data: updated, error: updateError } = await adminClient
        .from('vendor_due_diligence')
        .update({
          status: 'completed',
          results: result.results,
          raw_response: result.rawResponse,
          model_used: result.model,
          tokens_used: result.tokensUsed,
          search_queries_used: result.searchQueriesUsed,
          completed_at: new Date().toISOString(),
        })
        .eq('id', report.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating due diligence report:', updateError);
        return NextResponse.json(
          { message: 'Analysis completed but failed to save results' },
          { status: 500 }
        );
      }

      return NextResponse.json(updated);
    } else {
      // Update with error
      const { data: updated, error: updateError } = await adminClient
        .from('vendor_due_diligence')
        .update({
          status: 'failed',
          error_message: result.error,
          raw_response: result.rawResponse,
          completed_at: new Date().toISOString(),
        })
        .eq('id', report.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating failed due diligence report:', updateError);
      }

      return NextResponse.json(updated || report, { status: 502 });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

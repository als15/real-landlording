import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/api/admin';

interface VendorRow {
  id: string;
  status: string;
  services: string[] | null;
  service_areas: string[] | null;
  licensed: boolean;
  insured: boolean;
  rental_experience: boolean;
  emergency_services: boolean;
  years_in_business: number | null;
  employee_count: string | null;
  performance_score: number | null;
  vetting_score: number | null;
  total_reviews: number;
  service_hours_weekdays: boolean;
  service_hours_weekends: boolean;
  service_hours_24_7: boolean;
  referral_fee_type: string | null;
  created_at: string;
}

export async function GET() {
  try {
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }

    const supabase = createAdminClient();

    // Fetch all vendors with segmentation-relevant fields
    const { data, error } = await supabase
      .from('vendors')
      .select(
        'id, status, services, service_areas, licensed, insured, rental_experience, emergency_services, ' +
        'years_in_business, employee_count, performance_score, vetting_score, total_reviews, ' +
        'service_hours_weekdays, service_hours_weekends, service_hours_24_7, ' +
        'referral_fee_type, created_at'
      );

    const vendors = data as unknown as VendorRow[] | null;

    if (error) {
      console.error('Vendor segmentation query error:', error);
      return NextResponse.json({ message: 'Failed to fetch vendor data' }, { status: 500 });
    }

    if (!vendors || vendors.length === 0) {
      return NextResponse.json({
        totalVendors: 0,
        statusDistribution: [],
        serviceCoverage: [],
        capabilities: { licensed: 0, insured: 0, rentalExperience: 0, emergencyServices: 0 },
        performanceTiers: [],
        availabilityBreakdown: [],
        topServiceAreas: [],
        tenureBuckets: [],
        employeeSizeBuckets: [],
        onboardingTrend: [],
      });
    }

    // --- Status Distribution ---
    const statusCounts: Record<string, number> = {};
    for (const v of vendors) {
      statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;
    }
    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

    // --- Service Coverage (how many vendors per service type) ---
    const serviceCounts: Record<string, number> = {};
    for (const v of vendors) {
      if (Array.isArray(v.services)) {
        for (const svc of v.services) {
          serviceCounts[svc] = (serviceCounts[svc] || 0) + 1;
        }
      }
    }
    const serviceCoverage = Object.entries(serviceCounts)
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count);

    // --- Capability Breakdown (active vendors only) ---
    const active = vendors.filter((v) => v.status === 'active');
    const capabilities = {
      licensed: active.filter((v) => v.licensed).length,
      insured: active.filter((v) => v.insured).length,
      rentalExperience: active.filter((v) => v.rental_experience).length,
      emergencyServices: active.filter((v) => v.emergency_services).length,
      total: active.length,
    };

    // --- Performance Tiers (active vendors with scores) ---
    const tiers: Record<string, number> = {
      'Elite (80-100)': 0,
      'Strong (60-79)': 0,
      'Average (40-59)': 0,
      'Developing (20-39)': 0,
      'New (0-19)': 0,
      'Unscored': 0,
    };
    for (const v of active) {
      const score = v.performance_score;
      if (score == null) {
        tiers['Unscored']++;
      } else if (score >= 80) {
        tiers['Elite (80-100)']++;
      } else if (score >= 60) {
        tiers['Strong (60-79)']++;
      } else if (score >= 40) {
        tiers['Average (40-59)']++;
      } else if (score >= 20) {
        tiers['Developing (20-39)']++;
      } else {
        tiers['New (0-19)']++;
      }
    }
    const performanceTiers = Object.entries(tiers)
      .map(([tier, count]) => ({ tier, count }))
      .filter((t) => t.count > 0);

    // --- Availability Breakdown (active vendors) ---
    const availabilityBreakdown = [
      { label: 'Weekdays', count: active.filter((v) => v.service_hours_weekdays).length },
      { label: 'Weekends', count: active.filter((v) => v.service_hours_weekends).length },
      { label: '24/7', count: active.filter((v) => v.service_hours_24_7).length },
    ];

    // --- Top Service Areas (across all vendors) ---
    const areaCounts: Record<string, number> = {};
    for (const v of vendors) {
      if (Array.isArray(v.service_areas)) {
        for (const area of v.service_areas) {
          areaCounts[area] = (areaCounts[area] || 0) + 1;
        }
      }
    }
    const topServiceAreas = Object.entries(areaCounts)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // --- Tenure Buckets (years in business, active vendors) ---
    const tenure: Record<string, number> = {
      'New (<1 yr)': 0,
      '1-3 years': 0,
      '4-10 years': 0,
      '10+ years': 0,
      'Unknown': 0,
    };
    for (const v of active) {
      const yrs = v.years_in_business;
      if (yrs == null) {
        tenure['Unknown']++;
      } else if (yrs < 1) {
        tenure['New (<1 yr)']++;
      } else if (yrs <= 3) {
        tenure['1-3 years']++;
      } else if (yrs <= 10) {
        tenure['4-10 years']++;
      } else {
        tenure['10+ years']++;
      }
    }
    const tenureBuckets = Object.entries(tenure)
      .map(([bucket, count]) => ({ bucket, count }))
      .filter((t) => t.count > 0);

    // --- Employee Size Buckets ---
    const empSize: Record<string, number> = {};
    for (const v of active) {
      const size = v.employee_count || 'Unknown';
      empSize[size] = (empSize[size] || 0) + 1;
    }
    const employeeSizeBuckets = Object.entries(empSize)
      .map(([size, count]) => ({ size, count }))
      .sort((a, b) => b.count - a.count);

    // --- Onboarding Trend (vendors created per month, last 6 months) ---
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthBuckets: Record<string, number> = {};
    for (const v of vendors) {
      const created = new Date(v.created_at);
      if (created >= sixMonthsAgo) {
        const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
        monthBuckets[key] = (monthBuckets[key] || 0) + 1;
      }
    }
    const onboardingTrend = Object.entries(monthBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => {
        const [year, m] = month.split('-');
        const date = new Date(Number(year), Number(m) - 1);
        return {
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          count,
        };
      });

    return NextResponse.json({
      totalVendors: vendors.length,
      statusDistribution,
      serviceCoverage,
      capabilities,
      performanceTiers,
      availabilityBreakdown,
      topServiceAreas,
      tenureBuckets,
      employeeSizeBuckets,
      onboardingTrend,
    });
  } catch (error) {
    console.error('Vendor segmentation API error:', error);
    return NextResponse.json({ message: 'Failed to fetch vendor segmentation' }, { status: 500 });
  }
}

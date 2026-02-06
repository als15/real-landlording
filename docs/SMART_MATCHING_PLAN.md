# Smart Matching Assistant - Implementation Plan

## Overview

Transform the current manual vendor matching process into an intelligent, AI-assisted system that suggests optimal vendor matches based on multiple factors, displays match confidence scores, and enables one-click matching.

---

## Current State

**What exists:**
- `VendorMatchingModal` - Manual vendor selection (up to 3)
- Basic filtering by service type + location
- Vendors sorted by `performance_score` only
- Rich vendor data (scores, history, specialties) exists but unused in matching
- Scoring algorithm in `src/lib/scoring/calculate.ts`

**Pain points:**
- Admin must manually evaluate each vendor
- No visibility into WHY a vendor is a good match
- No consideration of urgency, budget, specialties
- Time-consuming for high-volume request processing

---

## Proposed Solution

### Smart Matching Assistant Features

1. **Match Score Algorithm** - Calculate a request-specific match score for each vendor
2. **Auto-Suggestions** - Display top 3 recommended vendors with explanations
3. **Match Factors Display** - Show why each vendor is recommended
4. **One-Click Matching** - Quick action to select all suggested vendors
5. **Override Controls** - Admin can still manually adjust selections
6. **Match Confidence Indicator** - Visual indicator of match quality

---

## Implementation Plan

### Phase 1: Match Score Algorithm

**Goal:** Create a scoring function that evaluates vendor-request fit

**File:** `src/lib/matching/calculateMatchScore.ts`

#### Match Score Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Service Match | 25% | Does vendor offer the exact service? |
| Location Match | 20% | How well does service area overlap? |
| Performance Score | 15% | Overall vendor quality rating |
| Response Time | 10% | Historical response speed |
| Availability | 10% | Emergency capability if urgent |
| Specialty Match | 10% | Equipment/sub-category match |
| Capacity | 5% | Current workload (pending jobs) |
| Price Fit | 5% | Budget range compatibility |

#### Scoring Logic

```typescript
interface MatchScoreResult {
  vendorId: string;
  totalScore: number;        // 0-100
  confidence: 'high' | 'medium' | 'low';
  factors: MatchFactor[];
  warnings: string[];        // e.g., "No emergency availability"
  recommended: boolean;      // Score > 70
}

interface MatchFactor {
  name: string;
  score: number;             // 0-100
  weight: number;            // 0-1
  weighted: number;          // score * weight
  reason: string;            // Human-readable explanation
}
```

#### Service Match (25%)
- Exact service match: 100 points
- Parent category match: 50 points
- No match: 0 points

#### Location Match (20%)
- Exact zip code in service_areas: 100 points
- 4-digit prefix match: 80 points
- 3-digit prefix match: 60 points
- State match only: 30 points
- No match: 0 points

#### Performance Score (15%)
- Direct mapping from vendor.performance_score (0-100)

#### Response Time (10%)
- Average response < 4 hours: 100 points
- Average response < 12 hours: 75 points
- Average response < 24 hours: 50 points
- Average response < 48 hours: 25 points
- Slower or no data: 0 points

#### Availability/Urgency Match (10%)
- Emergency request + vendor.emergency_services = true: 100 points
- Emergency request + no emergency service: 0 points (+ warning)
- Non-emergency: 50 points (neutral)
- Weekend request + weekend availability: bonus +20

#### Specialty Match (10%)
- service_specialties contains requested equipment type: 100 points
- No specialty required: 50 points (neutral)
- Specialty required but not matched: 0 points

#### Capacity (5%)
- 0-2 pending jobs: 100 points
- 3-4 pending jobs: 60 points
- 5+ pending jobs: 20 points

#### Price Fit (5%)
- Vendor typically handles similar budget range: 100 points
- No budget data: 50 points (neutral)
- Mismatched budget expectations: 25 points

---

### Phase 2: API Endpoint for Smart Matching

**File:** `src/app/api/requests/[id]/suggestions/route.ts`

**Endpoint:** `GET /api/requests/[id]/suggestions`

**Response:**
```json
{
  "request": {
    "id": "uuid",
    "service_type": "plumber_sewer",
    "property_location": "19103",
    "urgency": "high"
  },
  "suggestions": [
    {
      "vendor": { /* full vendor object */ },
      "matchScore": {
        "totalScore": 92,
        "confidence": "high",
        "factors": [
          { "name": "Service Match", "score": 100, "weight": 0.25, "weighted": 25, "reason": "Offers plumbing services" },
          { "name": "Location", "score": 100, "weight": 0.20, "weighted": 20, "reason": "Serves zip 19103" },
          { "name": "Performance", "score": 88, "weight": 0.15, "weighted": 13.2, "reason": "4.4/5 avg rating" }
          // ... more factors
        ],
        "warnings": [],
        "recommended": true
      }
    },
    // ... more suggestions
  ],
  "allVendors": [/* remaining vendors with scores */],
  "meta": {
    "totalEligible": 12,
    "totalRecommended": 3,
    "averageScore": 67
  }
}
```

---

### Phase 3: Enhanced VendorMatchingModal UI

**File:** `src/components/admin/VendorMatchingModal.tsx`

#### UI Changes

1. **Suggestions Panel (New)**
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │ 🎯 Recommended Matches                    [Select All (3)]  │
   ├─────────────────────────────────────────────────────────────┤
   │ ┌─────────────────────────────────────────────────────────┐ │
   │ │ [✓] ABC Plumbing                          Score: 92/100 │ │
   │ │     ████████████████████░░ High Confidence              │ │
   │ │     ✓ Exact service match  ✓ Serves 19103              │ │
   │ │     ✓ 4.4★ rating          ✓ Responds in <4hrs         │ │
   │ └─────────────────────────────────────────────────────────┘ │
   │ ┌─────────────────────────────────────────────────────────┐ │
   │ │ [✓] Quick Fix Plumbing                    Score: 85/100 │ │
   │ │     ██████████████████░░░░ High Confidence              │ │
   │ │     ✓ Exact service match  ✓ Serves 191xx              │ │
   │ │     ✓ 4.2★ rating          ⚠ Avg response 8hrs         │ │
   │ └─────────────────────────────────────────────────────────┘ │
   │ ┌─────────────────────────────────────────────────────────┐ │
   │ │ [ ] Budget Pipes LLC                      Score: 71/100 │ │
   │ │     ██████████████░░░░░░░░ Medium Confidence            │ │
   │ │     ✓ Exact service match  ✓ Serves PA                 │ │
   │ │     ⚠ 3.8★ rating          ✓ Emergency available       │ │
   │ └─────────────────────────────────────────────────────────┘ │
   └─────────────────────────────────────────────────────────────┘
   ```

2. **All Vendors Table (Enhanced)**
   - Add "Match Score" column with progress bar
   - Add "Factors" expandable row
   - Sort by match score by default
   - Color-code rows by recommendation status

3. **Quick Actions**
   - "Select Top 3" button - one-click to select recommended
   - "Clear Selections" button
   - "Why this score?" tooltip on hover

4. **Filter Enhancements**
   - Filter by minimum match score
   - Filter by confidence level
   - Toggle to show/hide warnings

---

### Phase 4: Match Factor Components

**New Components:**

1. **MatchScoreBadge** - Circular score indicator with color
   ```
   File: src/components/admin/matching/MatchScoreBadge.tsx
   Props: { score: number, size: 'sm' | 'md' | 'lg' }
   ```

2. **MatchFactorsList** - Expandable list of scoring factors
   ```
   File: src/components/admin/matching/MatchFactorsList.tsx
   Props: { factors: MatchFactor[], warnings: string[] }
   ```

3. **ConfidenceIndicator** - Visual confidence bar
   ```
   File: src/components/admin/matching/ConfidenceIndicator.tsx
   Props: { confidence: 'high' | 'medium' | 'low' }
   ```

4. **VendorSuggestionCard** - Card for recommended vendor
   ```
   File: src/components/admin/matching/VendorSuggestionCard.tsx
   Props: { vendor: Vendor, matchScore: MatchScoreResult, selected: boolean, onSelect: () => void }
   ```

---

### Phase 5: Database & Tracking

**New Table:** `match_suggestions` (optional, for analytics)

```sql
CREATE TABLE match_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES service_requests(id),
  vendor_id UUID REFERENCES vendors(id),
  match_score NUMERIC(5,2),
  confidence TEXT,
  factors JSONB,
  was_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:** Track which suggestions were made and whether admin followed them. Useful for:
- Measuring suggestion accuracy
- Training future ML models
- Identifying patterns in admin overrides

---

## Implementation Checklist

### Phase 1: Core Algorithm (Week 1) - COMPLETED
- [x] Create `src/lib/matching/calculateMatchScore.ts`
- [x] Create `src/lib/matching/types.ts` for TypeScript interfaces
- [x] Implement each scoring factor function
- [x] Create `src/lib/matching/index.ts` for exports
- [ ] Add unit tests for scoring logic (future)

### Phase 2: API Endpoint (Week 1) - COMPLETED
- [x] Create `src/app/api/requests/[id]/suggestions/route.ts`
- [x] Fetch request details and eligible vendors
- [x] Apply match scoring to all vendors
- [x] Sort and return suggestions with metadata
- [x] Add error handling and validation

### Phase 3: UI Components (Week 2) - COMPLETED
- [x] Create `MatchScoreBadge` component
- [x] Create `MatchFactorsList` component
- [x] Create `ConfidenceIndicator` component
- [x] Create `VendorSuggestionCard` component
- [x] Style components with Tailwind/Ant Design

### Phase 4: Modal Enhancement (Week 2) - COMPLETED
- [x] Add suggestions panel to `VendorMatchingModal`
- [x] Integrate with suggestions API
- [x] Add "Select Top 3" quick action
- [x] Enhance vendor table with match scores
- [x] Add expandable factor details
- [x] Add loading/error states

### Phase 5: Polish & Analytics (Week 3) - PENDING
- [ ] Add match_suggestions tracking table (optional)
- [ ] Log suggestion selections for analytics
- [ ] Add admin feedback mechanism ("Was this helpful?")
- [ ] Performance optimization (caching, etc.)

---

## File Structure

```
src/
├── lib/
│   └── matching/
│       ├── index.ts                    # Main exports
│       ├── types.ts                    # TypeScript interfaces
│       ├── calculateMatchScore.ts      # Main scoring function
│       ├── factors/
│       │   ├── serviceMatch.ts         # Service type matching
│       │   ├── locationMatch.ts        # Zip code matching
│       │   ├── performanceScore.ts     # Performance factor
│       │   ├── responseTime.ts         # Response time factor
│       │   ├── availability.ts         # Urgency/availability
│       │   ├── specialtyMatch.ts       # Sub-category match
│       │   ├── capacity.ts             # Current workload
│       │   └── priceFit.ts             # Budget matching
│       └── __tests__/
│           └── calculateMatchScore.test.ts
│
├── app/
│   └── api/
│       └── requests/
│           └── [id]/
│               └── suggestions/
│                   └── route.ts        # Suggestions endpoint
│
└── components/
    └── admin/
        └── matching/
            ├── index.ts                # Exports
            ├── MatchScoreBadge.tsx
            ├── MatchFactorsList.tsx
            ├── ConfidenceIndicator.tsx
            └── VendorSuggestionCard.tsx
```

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Time to match (avg) | ~5 min | < 1 min |
| Admin clicks per match | ~10 | 2-3 |
| Match success rate | Unknown | Track & improve |
| Suggestion follow rate | N/A | > 70% |

---

## Future Enhancements

1. **ML-Based Scoring** - Train model on historical match outcomes
2. **Auto-Match Mode** - System matches without admin review for standard requests
3. **Vendor Preferences** - Let vendors set job preferences (size, type, location)
4. **Landlord History** - Factor in landlord's past vendor preferences
5. **Real-Time Availability** - Integrate with vendor calendars
6. **Price Quotes** - Request/display vendor quotes before matching

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Poor suggestions frustrate admins | Keep manual override easy, add feedback mechanism |
| Algorithm bias | Regular review of scoring weights, A/B testing |
| Performance issues | Cache vendor scores, lazy-load factors |
| Over-reliance on automation | Maintain human review for complex/high-value requests |

---

## Questions for Product Review

1. Should we auto-select top 3 by default, or just highlight them?
2. What's the minimum score threshold for recommendations (70? 60?)?
3. Should we track when admins override suggestions? (for algorithm tuning)
4. Priority of scoring factors - are the weights correct?
5. Should emergency requests have different matching logic?

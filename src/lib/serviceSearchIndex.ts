import type { ServiceCategoryConfig } from '@/types/database';

/** A flat, searchable item representing either a category or a sub-category option. */
export interface ServiceSearchItem {
  /** Unique key for React / Select value */
  key: string;
  /** Display label — the sub-category option (e.g. "Leak Repair") or category label */
  subCategoryLabel: string;
  /** Parent category display label (e.g. "Roofer") */
  categoryLabel: string;
  /** Group label (e.g. "Fix It / Build It") */
  groupLabel: string;
  /** ServiceCategory key to set in form */
  serviceCategory: string;
  /** If this is a sub-category, which classification field it belongs to */
  classificationField?: string;
  /** If this is a sub-category, the value to auto-fill */
  classificationValue?: string;
  /** True for top-level category entries (no auto-fill) */
  isCategoryLevel: boolean;
  /** Pre-built lowercase search text (label + keywords + category label) */
  searchText: string;
}

/**
 * Build a flat search index from a taxonomy map and group labels.
 * Each category gets one category-level entry plus one entry per classification option.
 */
export function buildSearchIndex(
  taxonomyMap: Record<string, ServiceCategoryConfig>,
  groupLabels: Record<string, string>,
): ServiceSearchItem[] {
  const items: ServiceSearchItem[] = [];

  for (const [key, config] of Object.entries(taxonomyMap)) {
    const groupLabel = groupLabels[config.group] ?? config.group;
    const keywords = (config.searchKeywords ?? []).join(' ');

    // 1. Category-level entry
    items.push({
      key: `cat__${key}`,
      subCategoryLabel: config.label,
      categoryLabel: config.label,
      groupLabel,
      serviceCategory: key,
      isCategoryLevel: true,
      searchText: `${config.label} ${keywords} ${groupLabel}`.toLowerCase(),
    });

    // 2. Sub-category entries (one per classification option)
    for (const classification of config.classifications) {
      for (const option of classification.options) {
        const itemKey = `sub__${key}__${classification.label}__${option}`;
        items.push({
          key: itemKey,
          subCategoryLabel: option,
          categoryLabel: config.label,
          groupLabel,
          serviceCategory: key,
          classificationField: classification.label,
          classificationValue: option,
          isCategoryLevel: false,
          searchText: `${option} ${config.label} ${keywords} ${groupLabel}`.toLowerCase(),
        });
      }
    }
  }

  return items;
}

/**
 * Score a search item against tokenized user input.
 * Higher score = better match.
 * Returns 0 if not all tokens match at least partially.
 */
function scoreItem(item: ServiceSearchItem, tokens: string[]): number {
  let total = 0;
  const text = item.searchText;
  const subLabel = item.subCategoryLabel.toLowerCase();

  for (const token of tokens) {
    let tokenScore = 0;

    // Exact prefix of the main label — strongest signal
    if (subLabel.startsWith(token)) {
      tokenScore = 30;
    }
    // Word-start match in the main label
    else if (subLabel.includes(token) || new RegExp(`\\b${escapeRegex(token)}`).test(subLabel)) {
      tokenScore = 20;
    }
    // Match anywhere in search text (keywords, group, parent)
    else if (text.includes(token)) {
      tokenScore = 10;
    }
    // Token doesn't match at all — reject this item
    else {
      return 0;
    }

    total += tokenScore;
  }

  // Boost category-level items slightly so they appear before sub-items on ties
  if (item.isCategoryLevel) {
    total += 2;
  }

  return total;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Filter and score a search index against user input.
 * Returns at most `limit` results, sorted by descending score.
 */
export function filterSearchIndex(
  index: ServiceSearchItem[],
  searchText: string,
  limit = 20,
): ServiceSearchItem[] {
  const trimmed = searchText.trim().toLowerCase();
  if (!trimmed) return [];

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const scored: { item: ServiceSearchItem; score: number }[] = [];

  for (const item of index) {
    const score = scoreItem(item, tokens);
    if (score > 0) {
      scored.push({ item, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.item);
}

// ---------------------------------------------------------------------------
// Backward-compatible exports (deprecated — use buildSearchIndex + filterSearchIndex)
// ---------------------------------------------------------------------------

import {
  SERVICE_TAXONOMY,
  SERVICE_CATEGORY_GROUP_LABELS,
} from '@/types/database';

/** @deprecated Use buildSearchIndex() with DB-driven data instead */
export const SERVICE_SEARCH_INDEX: ServiceSearchItem[] = buildSearchIndex(
  SERVICE_TAXONOMY,
  SERVICE_CATEGORY_GROUP_LABELS,
);

/** @deprecated Use filterSearchIndex() with a dynamic index instead */
export function filterServiceOptions(
  searchText: string,
  limit = 20,
): ServiceSearchItem[] {
  return filterSearchIndex(SERVICE_SEARCH_INDEX, searchText, limit);
}

/** @deprecated Move to DB or admin-configurable */
export const POPULAR_SERVICES: string[] = [
  'plumber_sewer',
  'electrician',
  'handyman',
  'hvac',
  'roofer',
  'general_contractor',
  'cleaning',
  'pest_control',
  'legal_eviction',
  'property_management',
];

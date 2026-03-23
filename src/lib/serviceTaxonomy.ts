/**
 * Server-side service taxonomy loading from database.
 *
 * Provides cached access to service categories and groups stored in
 * the service_categories / service_category_groups tables.
 * Use these functions in API routes and server components instead of
 * the old hardcoded SERVICE_TAXONOMY constant.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { ServiceCategoryConfig, ServiceClassification } from '@/types/database';

// ---------------------------------------------------------------------------
// Types for DB rows
// ---------------------------------------------------------------------------

export interface ServiceCategoryRow {
  id: string;
  key: string;
  label: string;
  group_key: string;
  sort_order: number;
  is_active: boolean;
  classifications: ServiceClassification[];
  emergency_enabled: boolean;
  finish_level_enabled: boolean;
  external_link: boolean;
  external_url: string | null;
  search_keywords: string[];
  created_at: string;
  updated_at: string;
}

export interface ServiceCategoryGroupRow {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// In-memory cache (5-minute TTL)
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

let categoriesCache: CacheEntry<ServiceCategoryRow[]> | null = null;
let groupsCache: CacheEntry<ServiceCategoryGroupRow[]> | null = null;

function isFresh<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
  return entry !== null && Date.now() < entry.expiresAt;
}

/** Clear the in-memory cache. Call after admin writes. */
export function invalidateServiceTaxonomyCache(): void {
  categoriesCache = null;
  groupsCache = null;
}

// ---------------------------------------------------------------------------
// Core data fetchers (with cache)
// ---------------------------------------------------------------------------

/** Fetch all active service categories, ordered by group sort + category sort. */
export async function getServiceCategories(): Promise<ServiceCategoryRow[]> {
  if (isFresh(categoriesCache)) return categoriesCache.data;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('service_categories')
    .select('*')
    .eq('is_active', true)
    .order('group_key')
    .order('sort_order');

  if (error) {
    console.error('Failed to fetch service categories:', error);
    throw new Error('Failed to fetch service categories');
  }

  categoriesCache = { data: data ?? [], expiresAt: Date.now() + CACHE_TTL_MS };
  return categoriesCache.data;
}

/** Fetch all active service category groups, ordered by sort_order. */
export async function getServiceCategoryGroups(): Promise<ServiceCategoryGroupRow[]> {
  if (isFresh(groupsCache)) return groupsCache.data;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('service_category_groups')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('Failed to fetch service category groups:', error);
    throw new Error('Failed to fetch service category groups');
  }

  groupsCache = { data: data ?? [], expiresAt: Date.now() + CACHE_TTL_MS };
  return groupsCache.data;
}

// ---------------------------------------------------------------------------
// Derived helpers (same shapes as old hardcoded helpers)
// ---------------------------------------------------------------------------

/**
 * Returns a `Record<string, ServiceCategoryConfig>` matching the old
 * `SERVICE_TAXONOMY` shape so existing consumers can switch with minimal
 * changes.
 */
export async function getServiceTaxonomyMap(): Promise<Record<string, ServiceCategoryConfig>> {
  const categories = await getServiceCategories();
  const map: Record<string, ServiceCategoryConfig> = {};

  for (const cat of categories) {
    map[cat.key] = {
      label: cat.label,
      group: cat.group_key as ServiceCategoryConfig['group'],
      classifications: cat.classifications,
      emergencyEnabled: cat.emergency_enabled,
      finishLevelEnabled: cat.finish_level_enabled,
      externalLink: cat.external_link || undefined,
      externalUrl: cat.external_url || undefined,
      searchKeywords: cat.search_keywords,
    };
  }

  return map;
}

/** Returns `Record<string, string>` of category key → display label. */
export async function getServiceTypeLabels(): Promise<Record<string, string>> {
  const categories = await getServiceCategories();
  const labels: Record<string, string> = {};
  for (const cat of categories) {
    labels[cat.key] = cat.label;
  }
  return labels;
}

/** Returns `Record<string, string>` of group key → display label. */
export async function getGroupLabels(): Promise<Record<string, string>> {
  const groups = await getServiceCategoryGroups();
  const labels: Record<string, string> = {};
  for (const g of groups) {
    labels[g.key] = g.label;
  }
  return labels;
}

/**
 * Returns groups with their categories, sorted by group sort_order then
 * category sort_order. Same shape as old `getGroupedServiceCategories()`.
 */
export async function getGroupedServiceCategories(): Promise<
  { group: string; label: string; categories: { value: string; label: string }[] }[]
> {
  const [groups, categories] = await Promise.all([
    getServiceCategoryGroups(),
    getServiceCategories(),
  ]);

  return groups.map((g) => ({
    group: g.key,
    label: g.label,
    categories: categories
      .filter((c) => c.group_key === g.key)
      .map((c) => ({ value: c.key, label: c.label })),
  }));
}

'use client';

import { useState, useEffect } from 'react';
import type { ServiceCategoryConfig, ServiceClassification } from '@/types/database';

// ---------------------------------------------------------------------------
// Types matching the public API response
// ---------------------------------------------------------------------------

export interface ServiceCategoryDTO {
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
}

export interface ServiceCategoryGroupDTO {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

// ---------------------------------------------------------------------------
// Module-level singleton: fetch once, share across all hook instances
// ---------------------------------------------------------------------------

let cachedCategories: ServiceCategoryDTO[] | null = null;
let cachedGroups: ServiceCategoryGroupDTO[] | null = null;
let fetchPromise: Promise<void> | null = null;
let fetchError: string | null = null;

function doFetch(): Promise<void> {
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('/api/service-categories')
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      cachedCategories = json.categories;
      cachedGroups = json.groups;
      fetchError = null;
    })
    .catch((err) => {
      fetchError = err.message ?? 'Failed to load service categories';
      fetchPromise = null; // allow retry on next mount
    });

  return fetchPromise;
}

// ---------------------------------------------------------------------------
// Derived data builders (computed once from cached data)
// ---------------------------------------------------------------------------

let derivedTaxonomyMap: Record<string, ServiceCategoryConfig> | null = null;
let derivedLabels: Record<string, string> | null = null;
let derivedGroupLabels: Record<string, string> | null = null;

function buildDerived() {
  if (!cachedCategories || !cachedGroups) return;
  if (derivedTaxonomyMap) return; // already built

  const map: Record<string, ServiceCategoryConfig> = {};
  const labels: Record<string, string> = {};
  const gLabels: Record<string, string> = {};

  for (const cat of cachedCategories) {
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
    labels[cat.key] = cat.label;
  }

  for (const g of cachedGroups) {
    gLabels[g.key] = g.label;
  }

  derivedTaxonomyMap = map;
  derivedLabels = labels;
  derivedGroupLabels = gLabels;
}

function clearDerived() {
  derivedTaxonomyMap = null;
  derivedLabels = null;
  derivedGroupLabels = null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseServiceTaxonomyResult {
  categories: ServiceCategoryDTO[];
  groups: ServiceCategoryGroupDTO[];
  taxonomyMap: Record<string, ServiceCategoryConfig>;
  labels: Record<string, string>;
  groupLabels: Record<string, string>;
  loading: boolean;
  error: string | null;
}

export function useServiceTaxonomy(): UseServiceTaxonomyResult {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (cachedCategories && cachedGroups) {
      buildDerived();
      return;
    }

    let cancelled = false;
    doFetch().then(() => {
      if (!cancelled) {
        buildDerived();
        setTick((t) => t + 1);
      }
    });

    return () => { cancelled = true; };
  }, []);

  const loading = !cachedCategories || !cachedGroups;

  return {
    categories: cachedCategories ?? [],
    groups: cachedGroups ?? [],
    taxonomyMap: derivedTaxonomyMap ?? {},
    labels: derivedLabels ?? {},
    groupLabels: derivedGroupLabels ?? {},
    loading,
    error: fetchError,
  };
}

/**
 * Force refetch and re-render all hook consumers.
 * Call after admin CRUD operations.
 */
export function refreshServiceTaxonomy(): Promise<void> {
  cachedCategories = null;
  cachedGroups = null;
  fetchPromise = null;
  fetchError = null;
  clearDerived();
  return doFetch().then(() => buildDerived());
}

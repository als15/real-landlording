'use client';

import { useState, useMemo } from 'react';
import { Select, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ServiceCategory, ServiceCategoryConfig } from '@/types/database';
import { useServiceTaxonomy } from '@/hooks/useServiceTaxonomy';
import {
  type ServiceSearchItem,
  buildSearchIndex,
  filterSearchIndex,
} from '@/lib/serviceSearchIndex';

const { Text } = Typography;

const POPULAR_SERVICES = [
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

interface ServiceSearchSelectProps {
  value?: ServiceCategory;
  onChange?: (category: ServiceCategory) => void;
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
}

export default function ServiceSearchSelect({
  value,
  onChange,
  placeholder = 'Search for a service...',
  size = 'large',
}: ServiceSearchSelectProps) {
  const { taxonomyMap, groupLabels, loading } = useServiceTaxonomy();
  const [searchText, setSearchText] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  // Build search index from DB-driven taxonomy
  const searchIndex = useMemo(
    () => buildSearchIndex(taxonomyMap, groupLabels),
    [taxonomyMap, groupLabels],
  );

  // Build default (empty-search) options
  const defaultOptions = useMemo(() => {
    const items: ServiceSearchItem[] = [];

    // Popular services first
    for (const cat of POPULAR_SERVICES) {
      const config = taxonomyMap[cat];
      if (config) {
        items.push({
          key: `popular__${cat}`,
          subCategoryLabel: config.label,
          categoryLabel: config.label,
          groupLabel: 'Popular Services',
          serviceCategory: cat,
          isCategoryLevel: true,
          searchText: '',
        });
      }
    }

    // Then all categories grouped by their group
    // Sort groups by the order they appear in groupLabels
    const groupKeys = Object.keys(groupLabels);
    for (const groupKey of groupKeys) {
      const groupLabel = groupLabels[groupKey];
      const categoriesInGroup = searchIndex.filter(
        (item) => item.isCategoryLevel && taxonomyMap[item.serviceCategory]?.group === groupKey,
      ).sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel));

      for (const cat of categoriesInGroup) {
        if (POPULAR_SERVICES.includes(cat.serviceCategory)) continue;
        items.push({
          ...cat,
          key: `browse__${cat.serviceCategory}`,
          groupLabel,
        });
      }
    }

    return items;
  }, [taxonomyMap, groupLabels, searchIndex]);

  const displayItems = useMemo(() => {
    if (!searchText.trim()) return defaultOptions;
    return filterSearchIndex(searchIndex, searchText);
  }, [searchText, defaultOptions, searchIndex]);

  const isSearching = searchText.trim().length > 0;

  // Group items for display
  const groupedOptions = useMemo(() => {
    const groups: Record<string, ServiceSearchItem[]> = {};
    for (const item of displayItems) {
      const groupKey = item.groupLabel;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    }
    return groups;
  }, [displayItems]);

  const handleSelect = (_selectValue: string, option: { 'data-item'?: ServiceSearchItem }) => {
    const item = option['data-item'];
    if (!item) return;

    const categoryConfig = taxonomyMap[item.serviceCategory];

    // External link check
    if (categoryConfig?.externalLink && categoryConfig.externalUrl) {
      window.open(categoryConfig.externalUrl, '_blank');
      return;
    }

    setSelectedLabel(
      item.isCategoryLevel
        ? item.categoryLabel
        : `${item.subCategoryLabel} — ${item.categoryLabel}`,
    );
    onChange?.(item.serviceCategory);
    setSearchText('');
  };

  // Display label
  const displayLabel = value
    ? selectedLabel ?? taxonomyMap[value]?.label
    : undefined;

  return (
    <Select
      showSearch
      value={value ? { value, label: displayLabel } as unknown as string : undefined}
      placeholder={placeholder}
      size={size}
      filterOption={false}
      onSearch={setSearchText}
      onSelect={handleSelect}
      suffixIcon={<SearchOutlined />}
      notFoundContent={loading ? 'Loading...' : searchText ? 'No services found' : null}
      style={{ width: '100%' }}
      optionLabelProp="label"
      listHeight={350}
    >
      {isSearching
        ? displayItems.map((item) => (
            <Select.Option
              key={item.key}
              value={item.key}
              label={item.isCategoryLevel ? item.categoryLabel : `${item.subCategoryLabel} — ${item.categoryLabel}`}
              data-item={item}
            >
              <div>
                <div style={{ fontWeight: 600, lineHeight: 1.3 }}>
                  {item.subCategoryLabel}
                </div>
                {!item.isCategoryLevel && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.categoryLabel}
                  </Text>
                )}
                {item.isCategoryLevel && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.groupLabel}
                  </Text>
                )}
              </div>
            </Select.Option>
          ))
        : Object.entries(groupedOptions).map(([groupLabel, items]) => (
            <Select.OptGroup key={groupLabel} label={groupLabel}>
              {items.map((item) => (
                <Select.Option
                  key={item.key}
                  value={item.key}
                  label={item.isCategoryLevel ? item.categoryLabel : `${item.subCategoryLabel} — ${item.categoryLabel}`}
                  data-item={item}
                >
                  <div>
                    <div style={{ fontWeight: 600, lineHeight: 1.3 }}>
                      {item.subCategoryLabel}
                    </div>
                    {!item.isCategoryLevel && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.categoryLabel}
                      </Text>
                    )}
                  </div>
                </Select.Option>
              ))}
            </Select.OptGroup>
          ))}
    </Select>
  );
}

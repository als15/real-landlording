'use client';

import { useState, useMemo } from 'react';
import { Select, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import {
  ServiceCategory,
  SERVICE_TAXONOMY,
  SERVICE_CATEGORY_GROUP_LABELS,
  ServiceCategoryGroup,
} from '@/types/database';
import {
  ServiceSearchItem,
  filterServiceOptions,
  POPULAR_SERVICES,
  SERVICE_SEARCH_INDEX,
} from '@/lib/serviceSearchIndex';

const { Text } = Typography;

export interface ServiceSearchSelectAutoFill {
  field: string;
  value: string;
}

interface ServiceSearchSelectProps {
  value?: ServiceCategory;
  onChange?: (category: ServiceCategory, autoFill?: ServiceSearchSelectAutoFill) => void;
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
}

/** Build the default (empty-search) options: popular services, then all categories grouped. */
function buildDefaultOptions(): ServiceSearchItem[] {
  const items: ServiceSearchItem[] = [];

  // Popular services first
  for (const cat of POPULAR_SERVICES) {
    const config = SERVICE_TAXONOMY[cat];
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

  // Then all categories grouped
  const groupOrder: ServiceCategoryGroup[] = [
    'trades_technical',
    'property_care',
    'compliance_testing',
    'professional_financial',
    'creative_knowledge',
  ];

  for (const group of groupOrder) {
    const groupLabel = SERVICE_CATEGORY_GROUP_LABELS[group];
    const categoriesInGroup = SERVICE_SEARCH_INDEX.filter(
      (item) => item.isCategoryLevel && SERVICE_TAXONOMY[item.serviceCategory].group === group,
    ).sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel));

    for (const cat of categoriesInGroup) {
      // Skip if already in popular
      if (POPULAR_SERVICES.includes(cat.serviceCategory)) continue;
      items.push({
        ...cat,
        key: `browse__${cat.serviceCategory}`,
        groupLabel: groupLabel,
      });
    }
  }

  return items;
}

export default function ServiceSearchSelect({
  value,
  onChange,
  placeholder = 'Search for a service...',
  size = 'large',
}: ServiceSearchSelectProps) {
  const [searchText, setSearchText] = useState('');

  const defaultOptions = useMemo(() => buildDefaultOptions(), []);

  const displayItems = useMemo(() => {
    if (!searchText.trim()) return defaultOptions;
    return filterServiceOptions(searchText);
  }, [searchText, defaultOptions]);

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

    const categoryConfig = SERVICE_TAXONOMY[item.serviceCategory];

    // External link check
    if (categoryConfig.externalLink && categoryConfig.externalUrl) {
      window.open(categoryConfig.externalUrl, '_blank');
      return;
    }

    const autoFill =
      !item.isCategoryLevel && item.classificationField && item.classificationValue
        ? { field: item.classificationField, value: item.classificationValue }
        : undefined;

    onChange?.(item.serviceCategory, autoFill);
    setSearchText('');
  };

  // Find current label for display
  const currentLabel = value ? SERVICE_TAXONOMY[value]?.label : undefined;

  return (
    <Select
      showSearch
      value={value ? { value, label: currentLabel } as unknown as string : undefined}
      placeholder={placeholder}
      size={size}
      filterOption={false}
      onSearch={setSearchText}
      onSelect={handleSelect}
      suffixIcon={<SearchOutlined />}
      notFoundContent={searchText ? 'No services found' : null}
      style={{ width: '100%' }}
      optionLabelProp="label"
      listHeight={350}
    >
      {Object.entries(groupedOptions).map(([groupLabel, items]) => (
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

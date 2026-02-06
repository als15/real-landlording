'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  App,
  Checkbox,
  Alert,
  Descriptions,
  Tooltip,
  Input,
  Switch,
  Tabs,
  Spin,
  Empty,
} from 'antd';
import {
  WarningOutlined,
  TrophyOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import {
  Vendor,
  ServiceRequest,
  SERVICE_TYPE_LABELS,
  URGENCY_LABELS,
} from '@/types/database';
import { getScoreTier, SCORE_TIERS, type ScoreTier } from '@/lib/scoring/config';
import type { VendorWithMatchScore, SuggestionsResponse } from '@/lib/matching';
import {
  VendorSuggestionCard,
  MatchScoreBadge,
} from './matching';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

// Helper to get tier display info
function getTierDisplay(score: number, hasReviews: boolean): { tier: ScoreTier; color: string; label: string; isRecommended: boolean; isWarning: boolean } {
  const tier = getScoreTier(score, hasReviews);
  const config = SCORE_TIERS[tier];
  const isRecommended = tier === 'excellent' || tier === 'good';
  const isWarning = tier === 'below_average' || tier === 'poor';
  return { tier, color: config.color, label: config.label, isRecommended, isWarning };
}

// Helper to format service area for display
function formatServiceArea(area: string): string {
  if (area.startsWith('state:')) {
    return `${area.replace('state:', '')} (state)`;
  }
  if (area.startsWith('prefix:')) {
    const prefix = area.replace('prefix:', '');
    return `${prefix}${'x'.repeat(5 - prefix.length)}`;
  }
  return area;
}

interface VendorMatchingModalProps {
  open: boolean;
  request: ServiceRequest | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function VendorMatchingModal({
  open,
  request,
  onClose,
  onSuccess,
}: VendorMatchingModalProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [suggestions, setSuggestions] = useState<VendorWithMatchScore[]>([]);
  const [otherVendors, setOtherVendors] = useState<VendorWithMatchScore[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAllVendors, setShowAllVendors] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('suggestions');
  const [meta, setMeta] = useState<SuggestionsResponse['meta'] | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { message } = App.useApp();

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm]);

  const fetchSuggestions = useCallback(async () => {
    if (!request) return;

    setSuggestionsLoading(true);
    try {
      const response = await fetch(`/api/requests/${request.id}/suggestions`);
      if (response.ok) {
        const data: SuggestionsResponse = await response.json();
        setSuggestions(data.suggestions);
        setOtherVendors(data.otherVendors);
        setMeta(data.meta);
      } else {
        console.error('Failed to fetch suggestions');
        message.error('Failed to load smart suggestions');
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      message.error('Failed to load smart suggestions');
    } finally {
      setSuggestionsLoading(false);
    }
  }, [request, message]);

  const fetchVendors = useCallback(async () => {
    if (!request) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: 'active',
      });

      const hasSearch = debouncedSearch.trim().length > 0;

      // Only filter by service type if not showing all vendors AND not searching
      if (!showAllVendors && !hasSearch) {
        params.set('service_type', request.service_type);
        if (request.zip_code) {
          params.set('zip_code', request.zip_code);
          params.set('require_location', 'true');
        } else if (request.property_location) {
          params.set('location', request.property_location);
          params.set('require_location', 'true');
        }
      }

      if (hasSearch) {
        params.set('search', debouncedSearch.trim());
      }

      const response = await fetch(`/api/vendors?${params}`);
      if (response.ok) {
        const { data } = await response.json();
        setVendors(data || []);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      message.error('Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  }, [request, debouncedSearch, showAllVendors, message]);

  // Fetch suggestions when modal opens
  useEffect(() => {
    if (open && request) {
      fetchSuggestions();
    }
  }, [open, request, fetchSuggestions]);

  // Fetch all vendors for manual search
  useEffect(() => {
    if (open && request && (showAllVendors || debouncedSearch)) {
      fetchVendors();
    }
  }, [open, request, showAllVendors, debouncedSearch, fetchVendors]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setShowAllVendors(false);
      setSearchTerm('');
      setDebouncedSearch('');
      setSelectedVendors([]);
      setActiveTab('suggestions');
      setSuggestions([]);
      setOtherVendors([]);
      setMeta(null);
    }
  }, [open]);

  const handleSelectVendor = (vendorId: string, checked: boolean) => {
    if (checked) {
      if (selectedVendors.length >= 3) {
        message.warning('You can only select up to 3 vendors');
        return;
      }
      setSelectedVendors([...selectedVendors, vendorId]);
    } else {
      setSelectedVendors(selectedVendors.filter((id) => id !== vendorId));
    }
  };

  const handleSelectTopSuggestions = () => {
    const topIds = suggestions.slice(0, 3).map(v => v.id);
    setSelectedVendors(topIds);
    message.success(`Selected top ${topIds.length} recommended vendors`);
  };

  const handleSubmit = async () => {
    if (selectedVendors.length === 0) {
      message.error('Please select at least one vendor');
      return;
    }

    if (!request) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/requests/${request.id}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_ids: selectedVendors }),
      });

      if (response.ok) {
        message.success('Vendors matched successfully!');
        setSelectedVendors([]);
        onSuccess();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to match vendors');
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  // Columns for the manual vendor table
  const columns: ColumnsType<Vendor | VendorWithMatchScore> = [
    {
      title: '',
      key: 'select',
      width: 50,
      render: (_, record) => (
        <Checkbox
          checked={selectedVendors.includes(record.id)}
          onChange={(e) => handleSelectVendor(record.id, e.target.checked)}
        />
      ),
    },
    {
      title: 'Match',
      key: 'matchScore',
      width: 80,
      render: (_, record) => {
        const vendorWithScore = record as VendorWithMatchScore;
        if (vendorWithScore.matchScore) {
          return (
            <MatchScoreBadge
              score={vendorWithScore.matchScore.totalScore}
              confidence={vendorWithScore.matchScore.confidence}
              size="small"
              showLabel={false}
            />
          );
        }
        return <Text type="secondary">-</Text>;
      },
      sorter: (a, b) => {
        const aScore = (a as VendorWithMatchScore).matchScore?.totalScore ?? 0;
        const bScore = (b as VendorWithMatchScore).matchScore?.totalScore ?? 0;
        return aScore - bScore;
      },
      defaultSortOrder: 'descend',
    },
    {
      title: 'Business',
      key: 'business',
      render: (_, record) => (
        <div>
          <div>{record.business_name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.contact_name}
          </Text>
        </div>
      ),
    },
    {
      title: 'Services',
      dataIndex: 'services',
      key: 'services',
      render: (services: string[]) => (
        <Space wrap size="small">
          {services.slice(0, 2).map((s) => (
            <Tag key={s} color="blue">
              {SERVICE_TYPE_LABELS[s as keyof typeof SERVICE_TYPE_LABELS] || s}
            </Tag>
          ))}
          {services.length > 2 && <Tag>+{services.length - 2}</Tag>}
        </Space>
      ),
    },
    {
      title: 'Service Areas',
      dataIndex: 'service_areas',
      key: 'service_areas',
      render: (areas: string[]) => {
        if (!areas || areas.length === 0) return '-';
        const formatted = areas.slice(0, 3).map(formatServiceArea);
        return formatted.join(', ') + (areas.length > 3 ? '...' : '');
      },
    },
    {
      title: 'Rating',
      dataIndex: 'performance_score',
      key: 'performance_score',
      width: 140,
      render: (score, record) => {
        const hasReviews = record.total_reviews > 0;
        const tierInfo = getTierDisplay(score, hasReviews);

        return (
          <Space>
            {tierInfo.isRecommended && (
              <Tooltip title="Recommended vendor">
                <TrophyOutlined style={{ color: '#faad14' }} />
              </Tooltip>
            )}
            {tierInfo.isWarning && (
              <Tooltip title="Low performance - use with caution">
                <WarningOutlined style={{ color: '#ff4d4f' }} />
              </Tooltip>
            )}
            <Tag color={tierInfo.color} style={{ margin: 0 }}>
              {tierInfo.label}
            </Tag>
            {hasReviews && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                ({record.total_reviews})
              </Text>
            )}
          </Space>
        );
      },
      sorter: (a, b) => a.performance_score - b.performance_score,
    },
  ];

  // Render suggestions tab content
  const renderSuggestionsTab = () => {
    if (suggestionsLoading) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Analyzing vendors...</Text>
          </div>
        </div>
      );
    }

    if (suggestions.length === 0) {
      return (
        <Empty
          description="No vendors match this request criteria"
          style={{ padding: 40 }}
        >
          <Button onClick={() => setActiveTab('all')}>
            Browse All Vendors
          </Button>
        </Empty>
      );
    }

    return (
      <div>
        {/* Quick action bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Space>
            <ThunderboltOutlined style={{ color: '#faad14' }} />
            <Text strong>Top {suggestions.length} Recommended</Text>
            {meta && (
              <Text type="secondary">
                (from {meta.totalEligible} vendors, avg score: {meta.averageScore})
              </Text>
            )}
          </Space>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleSelectTopSuggestions}
            disabled={suggestions.length === 0}
          >
            Select Top {Math.min(3, suggestions.length)}
          </Button>
        </div>

        {/* Suggestion cards */}
        {suggestions.map((vendor, index) => (
          <VendorSuggestionCard
            key={vendor.id}
            vendor={vendor}
            selected={selectedVendors.includes(vendor.id)}
            onSelect={(selected) => handleSelectVendor(vendor.id, selected)}
            showDetails={true}
            rank={index + 1}
          />
        ))}

        {/* Link to all vendors if user wants more options */}
        {otherVendors.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Text type="secondary">
              {otherVendors.length} other vendors available.{' '}
              <Button type="link" size="small" onClick={() => setActiveTab('all')}>
                Browse all vendors
              </Button>
            </Text>
          </div>
        )}
      </div>
    );
  };

  // Render all vendors tab content
  const renderAllVendorsTab = () => {
    // Combine suggestions and other vendors for the table
    const allScoredVendors = [...suggestions, ...otherVendors];

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Space>
            <Input
              placeholder="Search vendors..."
              prefix={<SearchOutlined />}
              allowClear
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 200 }}
            />
            <Tooltip title="Enable to search all active vendors, not just those matching the service type">
              <Space>
                <Text type="secondary">Show all vendors</Text>
                <Switch
                  checked={showAllVendors}
                  onChange={setShowAllVendors}
                />
              </Space>
            </Tooltip>
          </Space>
          <Text type="secondary">
            {showAllVendors || debouncedSearch ? vendors.length : allScoredVendors.length} vendors
          </Text>
        </div>

        <Table
          columns={columns}
          dataSource={showAllVendors || debouncedSearch ? vendors : allScoredVendors}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ y: 400 }}
          size="small"
          rowClassName={(record) =>
            selectedVendors.includes(record.id) ? 'ant-table-row-selected' : ''
          }
        />
      </div>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <ThunderboltOutlined style={{ color: '#faad14' }} />
          <span>Smart Match Vendors</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={submitting}
          disabled={selectedVendors.length === 0}
        >
          Match {selectedVendors.length} Vendor{selectedVendors.length !== 1 ? 's' : ''}
        </Button>,
      ]}
    >
      {request && (
        <>
          {/* Request summary */}
          <Descriptions size="small" column={4} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Service">
              <Tag color="blue">{SERVICE_TYPE_LABELS[request.service_type]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Location">
              {request.zip_code || request.property_location}
            </Descriptions.Item>
            <Descriptions.Item label="Urgency">
              <Tag color={request.urgency === 'emergency' ? 'red' : 'default'}>
                {URGENCY_LABELS[request.urgency]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Selected">
              <Text strong>{selectedVendors.length}/3</Text>
            </Descriptions.Item>
          </Descriptions>

          {selectedVendors.length > 0 && (
            <Alert
              message={`${selectedVendors.length} vendor${selectedVendors.length > 1 ? 's' : ''} selected for matching`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              action={
                <Button size="small" onClick={() => setSelectedVendors([])}>
                  Clear
                </Button>
              }
            />
          )}

          {/* Tabs for suggestions vs all vendors */}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'suggestions',
                label: (
                  <Space>
                    <ThunderboltOutlined />
                    Smart Suggestions
                    {suggestions.length > 0 && (
                      <Tag color="success">{suggestions.length}</Tag>
                    )}
                  </Space>
                ),
                children: renderSuggestionsTab(),
              },
              {
                key: 'all',
                label: (
                  <Space>
                    <SearchOutlined />
                    All Vendors
                  </Space>
                ),
                children: renderAllVendorsTab(),
              },
            ]}
          />
        </>
      )}
    </Modal>
  );
}

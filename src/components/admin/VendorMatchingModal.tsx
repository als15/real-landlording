'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Checkbox,
  Alert,
  Descriptions,
  Tooltip,
  Input,
  Switch,
  Spin,
} from 'antd';
import { useNotify } from '@/hooks/useNotify';
import {
  WarningOutlined,
  TrophyOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  StarFilled,
} from '@ant-design/icons';
import {
  Vendor,
  ServiceRequest,
  URGENCY_LABELS,
} from '@/types/database';
import { useServiceTaxonomy } from '@/hooks/useServiceTaxonomy';
import { getScoreTier, SCORE_TIERS, type ScoreTier } from '@/lib/scoring/config';
import type { VendorWithMatchScore, SuggestionsResponse } from '@/lib/matching';
import { MatchScoreBadge } from './matching';
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
  const { labels: SERVICE_TYPE_LABELS } = useServiceTaxonomy();
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
  const [meta, setMeta] = useState<SuggestionsResponse['meta'] | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { message } = useNotify();

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
        message.error('Failed to load vendor scores');
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      message.error('Failed to load vendor scores');
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

  // All scored vendors merged and sorted by score descending
  const allScoredVendors = [...suggestions, ...otherVendors].sort(
    (a, b) => b.matchScore.totalScore - a.matchScore.totalScore
  );

  const handleSelectTopSuggestions = () => {
    const topIds = allScoredVendors.slice(0, 3).map(v => v.id);
    setSelectedVendors(topIds);
    message.success(`Selected top ${topIds.length} vendors`);
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

  // Determine which data source to show
  const isSearchingOrShowAll = showAllVendors || debouncedSearch.length > 0;
  const tableDataSource = isSearchingOrShowAll ? vendors : allScoredVendors;

  // Columns for the vendor table
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
      width: 90,
      render: (_, record) => {
        const vendorWithScore = record as VendorWithMatchScore;
        if (vendorWithScore.matchScore) {
          return (
            <Space size={4} align="center">
              {vendorWithScore.matchScore.recommended && (
                <Tooltip title="Recommended match">
                  <StarFilled style={{ color: '#faad14', fontSize: 14 }} />
                </Tooltip>
              )}
              <MatchScoreBadge
                score={vendorWithScore.matchScore.totalScore}
                confidence={vendorWithScore.matchScore.confidence}
                matchScore={vendorWithScore.matchScore}
                size="small"
                showLabel={false}
              />
            </Space>
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
              {SERVICE_TYPE_LABELS[s ] || s}
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

  return (
    <Modal
      title={
        <Space>
          <ThunderboltOutlined style={{ color: '#faad14' }} />
          <span>Match Vendors</span>
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

          {/* Toolbar: search, show-all toggle, Select Top 3 */}
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
            <Space>
              {meta && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {meta.totalEligible} scored, avg {meta.averageScore}
                </Text>
              )}
              <Button
                icon={<CheckCircleOutlined />}
                onClick={handleSelectTopSuggestions}
                disabled={allScoredVendors.length === 0 || isSearchingOrShowAll}
              >
                Select Top 3
              </Button>
              <Text type="secondary">
                {tableDataSource.length} vendors
              </Text>
            </Space>
          </div>

          {/* Loading state for initial score calculation */}
          {suggestionsLoading && !isSearchingOrShowAll ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Scoring vendors...</Text>
              </div>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={tableDataSource}
              rowKey="id"
              loading={isSearchingOrShowAll ? loading : false}
              pagination={false}
              scroll={{ y: 400 }}
              size="small"
              rowClassName={(record) =>
                selectedVendors.includes(record.id) ? 'ant-table-row-selected' : ''
              }
            />
          )}
        </>
      )}
    </Modal>
  );
}

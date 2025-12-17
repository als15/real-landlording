'use client';

import { useState, useEffect } from 'react';
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
} from 'antd';
import {
  StarFilled,
  WarningOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import {
  Vendor,
  ServiceRequest,
  SERVICE_TYPE_LABELS,
  VENDOR_STATUS_LABELS,
} from '@/types/database';
import { getScoreTier, SCORE_TIERS, type ScoreTier } from '@/lib/scoring/config';
import type { ColumnsType } from 'antd/es/table';

const { Text, Title } = Typography;

// Helper to get tier display info
function getTierDisplay(score: number, hasReviews: boolean): { tier: ScoreTier; color: string; label: string; isRecommended: boolean; isWarning: boolean } {
  const tier = getScoreTier(score, hasReviews);
  const config = SCORE_TIERS[tier];
  const isRecommended = tier === 'excellent' || tier === 'good';
  const isWarning = tier === 'below_average' || tier === 'poor';
  return { tier, color: config.color, label: config.label, isRecommended, isWarning };
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
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    if (open && request) {
      fetchMatchingVendors();
    }
  }, [open, request]);

  const fetchMatchingVendors = async () => {
    if (!request) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        service_type: request.service_type,
        status: 'active',
      });

      // Use zip_code if available, otherwise use property_location
      if (request.zip_code) {
        params.set('zip_code', request.zip_code);
      } else if (request.property_location) {
        params.set('location', request.property_location);
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
  };

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

  const columns: ColumnsType<Vendor> = [
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
      render: (areas: string[]) => areas.slice(0, 3).join(', ') + (areas.length > 3 ? '...' : ''),
    },
    {
      title: 'Rating',
      dataIndex: 'performance_score',
      key: 'performance_score',
      width: 180,
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
                {score.toFixed(0)} ({record.total_reviews})
              </Text>
            )}
          </Space>
        );
      },
      sorter: (a, b) => a.performance_score - b.performance_score,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {VENDOR_STATUS_LABELS[status as keyof typeof VENDOR_STATUS_LABELS]}
        </Tag>
      ),
    },
  ];

  return (
    <Modal
      title="Match Vendors to Request"
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
          <Descriptions size="small" column={3} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Service">
              {SERVICE_TYPE_LABELS[request.service_type]}
            </Descriptions.Item>
            <Descriptions.Item label="Location">
              {request.property_location}
            </Descriptions.Item>
            <Descriptions.Item label="Urgency">
              {request.urgency}
            </Descriptions.Item>
          </Descriptions>

          <Alert
            message="Select up to 3 vendors to match with this request"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Title level={5}>
            Matching Vendors ({vendors.length} found)
          </Title>

          <Table
            columns={columns}
            dataSource={vendors}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ y: 400 }}
            size="small"
            rowClassName={(record) =>
              selectedVendors.includes(record.id) ? 'ant-table-row-selected' : ''
            }
          />
        </>
      )}
    </Modal>
  );
}

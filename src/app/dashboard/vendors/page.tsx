'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Typography,
  Button,
  Empty,
  Space,
  Popconfirm,
  Input,
  Skeleton,
  Avatar,
} from 'antd';
import {
  DeleteOutlined,
  SafetyCertificateOutlined,
  StarFilled,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  PlusOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { Vendor } from '@/types/database';
import { useServiceTaxonomy } from '@/hooks/useServiceTaxonomy';
import { useNotify } from '@/hooks/useNotify';
import { brandColors } from '@/theme/config';
import Link from 'next/link';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface SavedVendorRow {
  id: string;
  vendor_id: string;
  notes: string | null;
  created_at: string;
  vendor: Pick<Vendor,
    'id' | 'business_name' | 'contact_name' | 'email' | 'phone' |
    'services' | 'performance_score' | 'total_reviews' | 'licensed' |
    'insured' | 'years_in_business' | 'website'
  >;
}

export default function SavedVendorsPage() {
  const { labels: SERVICE_TYPE_LABELS } = useServiceTaxonomy();
  const [savedVendors, setSavedVendors] = useState<SavedVendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const { message } = useNotify();

  const fetchSaved = useCallback(async () => {
    try {
      const res = await fetch('/api/landlord/saved-vendors');
      if (res.ok) {
        const { data } = await res.json();
        setSavedVendors(data || []);
      } else if (res.status === 401) {
        window.location.href = '/auth/login?redirectTo=/dashboard/vendors';
      }
    } catch (error) {
      console.error('Error fetching saved vendors:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const handleRemove = async (id: string) => {
    try {
      const res = await fetch(`/api/landlord/saved-vendors/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedVendors((prev) => prev.filter((sv) => sv.id !== id));
        message.success('Vendor removed');
      } else {
        throw new Error();
      }
    } catch {
      message.error('Failed to remove vendor');
    }
  };

  const handleSaveNotes = async (id: string) => {
    try {
      const res = await fetch(`/api/landlord/saved-vendors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesValue }),
      });
      if (res.ok) {
        setSavedVendors((prev) =>
          prev.map((sv) => sv.id === id ? { ...sv, notes: notesValue } : sv)
        );
        setEditingNotes(null);
        message.success('Notes saved');
      } else {
        throw new Error();
      }
    } catch {
      message.error('Failed to save notes');
    }
  };

  if (loading) {
    return (
      <div>
        <Title level={2}>Saved Vendors</Title>
        <Row gutter={[16, 16]}>
          {[1, 2, 3].map((i) => (
            <Col key={i} xs={24} sm={12} lg={8}>
              <Card><Skeleton active /></Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Saved Vendors</Title>
        <Text type="secondary">Your favorite vendors from past jobs</Text>
      </div>

      {savedVendors.length === 0 ? (
        <Card>
          <Empty
            description={
              <Space direction="vertical">
                <Text>Save your favorite vendors after completing a job.</Text>
                <Text type="secondary">
                  When viewing matched vendors on a request, click the heart icon to save them here.
                </Text>
                <Link href="/dashboard/requests">
                  <Button type="primary" icon={<PlusOutlined />}>
                    View My Requests
                  </Button>
                </Link>
              </Space>
            }
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {savedVendors.map((sv) => (
            <Col key={sv.id} xs={24} sm={12} lg={8}>
              <Card
                actions={[
                  <Link key="request" href="/request">
                    <Button type="link" size="small">Request This Vendor</Button>
                  </Link>,
                  <Popconfirm
                    key="remove"
                    title="Remove this vendor?"
                    onConfirm={() => handleRemove(sv.id)}
                    okText="Remove"
                    cancelText="Cancel"
                  >
                    <Button type="link" danger size="small" icon={<DeleteOutlined />}>
                      Remove
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <Card.Meta
                  avatar={
                    <Avatar
                      size={48}
                      icon={<ShopOutlined />}
                      style={{ backgroundColor: brandColors.primary }}
                    />
                  }
                  title={sv.vendor.business_name}
                  description={sv.vendor.contact_name}
                />

                <div style={{ marginTop: 12 }}>
                  {/* Services */}
                  <div style={{ marginBottom: 8 }}>
                    {sv.vendor.services.slice(0, 3).map((s) => (
                      <Tag key={s} style={{ marginBottom: 4 }}>
                        {SERVICE_TYPE_LABELS[s] || s}
                      </Tag>
                    ))}
                    {sv.vendor.services.length > 3 && (
                      <Tag>+{sv.vendor.services.length - 3}</Tag>
                    )}
                  </div>

                  {/* Rating */}
                  {sv.vendor.total_reviews > 0 && (
                    <div style={{ marginBottom: 4 }}>
                      <StarFilled style={{ color: brandColors.accent, marginRight: 4 }} />
                      <Text>{sv.vendor.performance_score}</Text>
                      <Text type="secondary"> ({sv.vendor.total_reviews} review{sv.vendor.total_reviews !== 1 ? 's' : ''})</Text>
                    </div>
                  )}

                  {/* Badges */}
                  <Space size="small" style={{ marginBottom: 8 }}>
                    {sv.vendor.licensed && (
                      <Tag color="blue" icon={<SafetyCertificateOutlined />}>Licensed</Tag>
                    )}
                    {sv.vendor.insured && (
                      <Tag color="green" icon={<SafetyCertificateOutlined />}>Insured</Tag>
                    )}
                    {sv.vendor.years_in_business && sv.vendor.years_in_business > 0 && (
                      <Tag>{sv.vendor.years_in_business}+ yrs</Tag>
                    )}
                  </Space>

                  {/* Notes */}
                  <div style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                    {editingNotes === sv.id ? (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <TextArea
                          rows={2}
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          placeholder="Add personal notes..."
                        />
                        <Space>
                          <Button size="small" icon={<CheckOutlined />} onClick={() => handleSaveNotes(sv.id)}>
                            Save
                          </Button>
                          <Button size="small" icon={<CloseOutlined />} onClick={() => setEditingNotes(null)}>
                            Cancel
                          </Button>
                        </Space>
                      </Space>
                    ) : (
                      <div
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setEditingNotes(sv.id);
                          setNotesValue(sv.notes || '');
                        }}
                      >
                        {sv.notes ? (
                          <Paragraph
                            type="secondary"
                            style={{ fontSize: 12, marginBottom: 0 }}
                            ellipsis={{ rows: 2 }}
                          >
                            {sv.notes}
                          </Paragraph>
                        ) : (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            <EditOutlined /> Add notes...
                          </Text>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}

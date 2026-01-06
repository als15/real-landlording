'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Table,
  Card,
  Tag,
  Space,
  Button,
  Typography,
  Modal,
  Descriptions,
  Divider,
  App,
  Badge,
  Input,
} from 'antd';
import {
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  SearchOutlined,
  DownloadOutlined,
  InstagramOutlined,
  FacebookOutlined,
  LinkedinOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  Vendor,
  SERVICE_TYPE_LABELS,
  SERVICE_TAXONOMY,
  ServiceCategory,
  EMPLOYEE_COUNT_OPTIONS,
  JOB_SIZE_RANGE_OPTIONS,
  ACCEPTED_PAYMENTS_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
} from '@/types/database';
import {
  objectsToCsv,
  downloadCsv,
  formatDateTimeForCsv,
  formatArrayForCsv,
  formatBooleanForCsv,
} from '@/lib/utils/csv-export';
import type { ColumnsType } from 'antd/es/table';
import ServiceAreaDisplay from '@/components/ServiceAreaDisplay';

const { Title, Text } = Typography;
const { TextArea, Search } = Input;

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Vendor | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { message } = App.useApp();

  // Editable fields state
  const [editSocialInstagram, setEditSocialInstagram] = useState('');
  const [editSocialFacebook, setEditSocialFacebook] = useState('');
  const [editSocialLinkedin, setEditSocialLinkedin] = useState('');
  const [editAdminNotes, setEditAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

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

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }

      const response = await fetch(`/api/admin/applications?${params}`);
      if (response.ok) {
        const { data } = await response.json();
        setApplications(data || []);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      message.error('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleViewApp = (app: Vendor) => {
    setSelectedApp(app);
    // Populate editable fields with current values
    setEditSocialInstagram(app.social_instagram || '');
    setEditSocialFacebook(app.social_facebook || '');
    setEditSocialLinkedin(app.social_linkedin || '');
    setEditAdminNotes(app.admin_notes || '');
    setDetailModalOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedApp) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/applications/${selectedApp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          social_instagram: editSocialInstagram || null,
          social_facebook: editSocialFacebook || null,
          social_linkedin: editSocialLinkedin || null,
          admin_notes: editAdminNotes || null,
        }),
      });

      if (response.ok) {
        message.success('Changes saved');
        // Update the local state
        setSelectedApp({
          ...selectedApp,
          social_instagram: editSocialInstagram || null,
          social_facebook: editSocialFacebook || null,
          social_linkedin: editSocialLinkedin || null,
          admin_notes: editAdminNotes || null,
        });
        fetchApplications();
      } else {
        throw new Error('Failed to save changes');
      }
    } catch {
      message.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());

      const response = await fetch(`/api/admin/applications?${params}`);
      if (!response.ok) throw new Error('Failed to fetch data');

      const { data } = await response.json();

      const csv = objectsToCsv(data, [
        { key: 'id', header: 'ID' },
        { key: 'business_name', header: 'Business Name' },
        { key: 'contact_name', header: 'Contact Name' },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Phone' },
        { key: 'website', header: 'Website' },
        { key: 'services', header: 'Services', formatter: (v) => formatArrayForCsv(v as unknown as string[]) },
        { key: 'service_areas', header: 'Service Areas', formatter: (v) => formatArrayForCsv(v as unknown as string[]) },
        { key: 'licensed', header: 'Licensed', formatter: (v) => formatBooleanForCsv(v as boolean) },
        { key: 'insured', header: 'Insured', formatter: (v) => formatBooleanForCsv(v as boolean) },
        { key: 'rental_experience', header: 'Rental Experience', formatter: (v) => formatBooleanForCsv(v as boolean) },
        { key: 'qualifications', header: 'Qualifications' },
        { key: 'created_at', header: 'Applied', formatter: (v) => formatDateTimeForCsv(v as string) },
      ]);

      downloadCsv(csv, `applications-${new Date().toISOString().split('T')[0]}`);
      message.success('Export complete');
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export data');
    }
  };

  const handleApprove = async (vendorId: string) => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/applications/${vendorId}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        message.success('Vendor approved successfully!');
        setDetailModalOpen(false);
        fetchApplications();
      } else {
        throw new Error('Failed to approve vendor');
      }
    } catch {
      message.error('Failed to approve vendor');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/applications/${selectedApp.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (response.ok) {
        message.success('Application rejected');
        setRejectModalOpen(false);
        setDetailModalOpen(false);
        setRejectReason('');
        fetchApplications();
      } else {
        throw new Error('Failed to reject application');
      }
    } catch {
      message.error('Failed to reject application');
    } finally {
      setProcessing(false);
    }
  };

  const columns: ColumnsType<Vendor> = [
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
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <div>
          <div>{record.email}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.phone}
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
      title: 'Applied',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewApp(record)}
          >
            Review
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => handleApprove(record.id)}
          >
            Approve
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Vendor Applications
          <Badge count={applications.length} style={{ marginLeft: 12 }} showZero />
        </Title>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExportCsv}>
            Export CSV
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchApplications}>
            Refresh
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <SearchOutlined />
          <Search
            placeholder="Search by business name, contact, email, or phone..."
            allowClear
            style={{ width: 400 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={applications}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          locale={{ emptyText: 'No pending applications' }}
        />
      </Card>

      {/* Application Detail Modal */}
      <Modal
        title="Application Review"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={700}
        footer={[
          <Button
            key="reject"
            danger
            icon={<CloseOutlined />}
            onClick={() => setRejectModalOpen(true)}
          >
            Reject
          </Button>,
          <Button
            key="approve"
            type="primary"
            icon={<CheckOutlined />}
            loading={processing}
            onClick={() => selectedApp && handleApprove(selectedApp.id)}
          >
            Approve
          </Button>,
        ]}
      >
        {selectedApp && (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Business Name" span={2}>
                {selectedApp.business_name}
              </Descriptions.Item>
              <Descriptions.Item label="Contact Name">
                {selectedApp.contact_name}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {selectedApp.phone}
              </Descriptions.Item>
              <Descriptions.Item label="Email" span={2}>
                {selectedApp.email}
              </Descriptions.Item>
              <Descriptions.Item label="Website" span={2}>
                {selectedApp.website || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Location" span={2}>
                {selectedApp.location || '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider>Services & Specialties</Divider>
            {selectedApp.services.map((service) => {
              const serviceKey = service as ServiceCategory;
              const serviceLabel = SERVICE_TYPE_LABELS[serviceKey] || service;
              const config = SERVICE_TAXONOMY[serviceKey];
              const specialties = selectedApp.service_specialties?.[serviceKey] || [];

              return (
                <div key={service} style={{ marginBottom: 16 }}>
                  <Tag color="blue" style={{ marginBottom: 8 }}>
                    {serviceLabel}
                  </Tag>
                  {config?.classifications && config.classifications.length > 0 && (
                    <div style={{ marginLeft: 8, marginTop: 4 }}>
                      {config.classifications.map((classification) => {
                        // Find which options from this classification the vendor selected
                        const selectedOptions = specialties.filter(s =>
                          classification.options.includes(s)
                        );

                        if (selectedOptions.length === 0) return null;

                        // Use vendor-friendly label
                        const displayLabel = classification.label === 'Service Needed'
                          ? 'Services Provided'
                          : classification.label;

                        return (
                          <div key={classification.label} style={{ marginBottom: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {displayLabel}:{' '}
                            </Text>
                            <Space size={4} wrap>
                              {selectedOptions.map(opt => (
                                <Tag key={opt} style={{ fontSize: 11 }}>{opt}</Tag>
                              ))}
                            </Space>
                          </div>
                        );
                      })}
                      {specialties.length === 0 && (
                        <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
                          No specialties specified
                        </Text>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <Divider>Service Areas</Divider>
            <ServiceAreaDisplay zipCodes={selectedApp.service_areas} />

            <Divider>Qualifications</Divider>
            <Descriptions column={3} size="small">
              <Descriptions.Item label="Licensed">
                {selectedApp.licensed ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Insured">
                {selectedApp.insured ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Rental Experience">
                {selectedApp.rental_experience ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>}
              </Descriptions.Item>
            </Descriptions>

            {selectedApp.qualifications && (
              <>
                <Divider>Experience Details</Divider>
                <Text>{selectedApp.qualifications}</Text>
              </>
            )}

            {selectedApp.call_preferences && (
              <>
                <Divider>Contact Preferences</Divider>
                <Text>{selectedApp.call_preferences}</Text>
              </>
            )}

            {/* Licensed Areas */}
            {selectedApp.licensed_areas && selectedApp.licensed_areas.length > 0 && (
              <>
                <Divider>Licensed Areas</Divider>
                <ServiceAreaDisplay zipCodes={selectedApp.licensed_areas} />
              </>
            )}

            {/* Business Details */}
            <Divider>Business Details</Divider>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Years in Business">
                {selectedApp.years_in_business !== null ? `${selectedApp.years_in_business}+ years` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Employees">
                {selectedApp.employee_count
                  ? EMPLOYEE_COUNT_OPTIONS.find(o => o.value === selectedApp.employee_count)?.label || selectedApp.employee_count
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Emergency Services">
                {selectedApp.emergency_services ? <Tag color="red">Yes - 24/7</Tag> : <Tag>No</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Job Size Range">
                {selectedApp.job_size_range && selectedApp.job_size_range.length > 0 ? (
                  <Space wrap size={4}>
                    {selectedApp.job_size_range.map(size => {
                      const label = JOB_SIZE_RANGE_OPTIONS.find(o => o.value === size)?.label || size;
                      return <Tag key={size}>{label}</Tag>;
                    })}
                  </Space>
                ) : '-'}
              </Descriptions.Item>
            </Descriptions>

            {/* Service Hours */}
            <Divider>Service Hours</Divider>
            <Space wrap>
              {selectedApp.service_hours_weekdays && <Tag color="blue">Weekdays</Tag>}
              {selectedApp.service_hours_weekends && <Tag color="blue">Weekends</Tag>}
              {selectedApp.service_hours_24_7 && <Tag color="red">24/7 Available</Tag>}
              {!selectedApp.service_hours_weekdays && !selectedApp.service_hours_weekends && !selectedApp.service_hours_24_7 && (
                <Text type="secondary">Not specified</Text>
              )}
            </Space>

            {/* Accepted Payments */}
            {selectedApp.accepted_payments && selectedApp.accepted_payments.length > 0 && (
              <>
                <Divider>Accepted Payments</Divider>
                <Space wrap>
                  {selectedApp.accepted_payments.map(payment => {
                    const label = ACCEPTED_PAYMENTS_OPTIONS.find(o => o.value === payment)?.label || payment;
                    return <Tag key={payment} color="green">{label}</Tag>;
                  })}
                </Space>
              </>
            )}

            {/* Referral Source */}
            {selectedApp.referral_source && (
              <>
                <Divider>How They Found Us</Divider>
                <Text>
                  {REFERRAL_SOURCE_OPTIONS.find(o => o.value === selectedApp.referral_source)?.label || selectedApp.referral_source}
                  {selectedApp.referral_source_name && (
                    <Text type="secondary"> — Referred by: {selectedApp.referral_source_name}</Text>
                  )}
                </Text>
              </>
            )}

            <Divider>Social Media</Divider>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Input
                prefix={<InstagramOutlined />}
                placeholder="Instagram handle or URL"
                value={editSocialInstagram}
                onChange={(e) => setEditSocialInstagram(e.target.value)}
              />
              <Input
                prefix={<FacebookOutlined />}
                placeholder="Facebook page URL"
                value={editSocialFacebook}
                onChange={(e) => setEditSocialFacebook(e.target.value)}
              />
              <Input
                prefix={<LinkedinOutlined />}
                placeholder="LinkedIn profile URL"
                value={editSocialLinkedin}
                onChange={(e) => setEditSocialLinkedin(e.target.value)}
              />
            </Space>

            <Divider>Admin Notes</Divider>
            <TextArea
              rows={4}
              placeholder="Add internal notes about this application..."
              value={editAdminNotes}
              onChange={(e) => setEditAdminNotes(e.target.value)}
            />

            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Button
                icon={<SaveOutlined />}
                onClick={handleSaveChanges}
                loading={saving}
              >
                Save Changes
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="Reject Application"
        open={rejectModalOpen}
        onCancel={() => setRejectModalOpen(false)}
        onOk={handleReject}
        confirmLoading={processing}
        okText="Reject Application"
        okButtonProps={{ danger: true }}
      >
        <Text>Optionally provide a reason for rejection (will be stored in admin notes):</Text>
        <TextArea
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reason for rejection..."
          style={{ marginTop: 12 }}
        />
      </Modal>
    </div>
  );
}

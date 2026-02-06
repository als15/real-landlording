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
  Select,
  Checkbox,
  InputNumber,
  Form,
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
  DeleteOutlined,
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
  CONTACT_PREFERENCE_LABELS,
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
import ServiceAreaAutocomplete from '@/components/ServiceAreaAutocomplete';

const { Title, Text } = Typography;
const { TextArea, Search } = Input;

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Vendor | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState<Vendor | null>(null);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { message } = App.useApp();

  // Form for editable fields
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [selectedServices, setSelectedServices] = useState<ServiceCategory[]>([]);

  // Get classifications (equipment types) for selected services
  const getServiceClassifications = (services: ServiceCategory[]) => {
    return services
      .map(service => {
        const config = SERVICE_TAXONOMY[service];
        if (!config || config.classifications.length === 0) return null;
        return {
          service,
          label: config.label,
          classifications: config.classifications
        };
      })
      .filter(Boolean) as Array<{
      service: ServiceCategory;
      label: string;
      classifications: Array<{ label: string; options: string[] }>;
    }>;
  };

  const serviceClassifications = getServiceClassifications(selectedServices);

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
    setSelectedServices(app.services || []);

    // Build service_specialties form fields from existing data
    // Data is stored as { hvac: ["Gas Furnace", "No Heat"] }
    // We need to reconstruct to { hvac: { "Equipment Type": ["Gas Furnace"], "Service Needed": ["No Heat"] } }
    const serviceSpecialtiesForm: Record<string, Record<string, string[]>> = {};
    if (app.service_specialties) {
      for (const [service, specialties] of Object.entries(app.service_specialties)) {
        const config = SERVICE_TAXONOMY[service as ServiceCategory];
        if (config && config.classifications.length > 0) {
          serviceSpecialtiesForm[service] = {};
          // For simplicity, put all specialties in the first classification
          // This is a limitation but matches how the data is stored (flattened)
          const firstClassification = config.classifications[0];
          serviceSpecialtiesForm[service][firstClassification.label] = specialties as string[];
        }
      }
    }

    // Populate form with current values
    form.setFieldsValue({
      website: app.website || '',
      location: app.location || '',
      services: app.services || [],
      service_specialties: serviceSpecialtiesForm,
      service_areas: app.service_areas || [],
      licensed: app.licensed || false,
      insured: app.insured || false,
      rental_experience: app.rental_experience || false,
      qualifications: app.qualifications || '',
      licensed_areas: app.licensed_areas || [],
      years_in_business: app.years_in_business,
      employee_count: app.employee_count || '',
      emergency_services: app.emergency_services || false,
      job_size_range: app.job_size_range || [],
      service_hours_weekdays: app.service_hours_weekdays || false,
      service_hours_weekends: app.service_hours_weekends || false,
      service_hours_24_7: app.service_hours_24_7 || false,
      accepted_payments: app.accepted_payments || [],
      call_preferences: app.call_preferences ? app.call_preferences.split(', ') : [],
      social_instagram: app.social_instagram || '',
      social_facebook: app.social_facebook || '',
      social_linkedin: app.social_linkedin || '',
      referral_source: app.referral_source || '',
      referral_source_name: app.referral_source_name || '',
      admin_notes: app.admin_notes || '',
    });
    setDetailModalOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedApp) return;

    setSaving(true);
    try {
      const values = form.getFieldsValue();

      // Transform service_specialties from nested form structure to flat storage format
      // Form: { hvac: { "Equipment Type": ["Gas Furnace"], "Service Needed": ["No Heat"] } }
      // Storage: { hvac: ["Gas Furnace", "No Heat"] }
      let serviceSpecialties: Record<string, string[]> | null = null;
      if (values.service_specialties && typeof values.service_specialties === 'object') {
        serviceSpecialties = {};
        for (const [service, classifications] of Object.entries(values.service_specialties)) {
          if (classifications && typeof classifications === 'object') {
            const allOptions: string[] = [];
            for (const options of Object.values(classifications as Record<string, string[]>)) {
              if (Array.isArray(options)) {
                allOptions.push(...options);
              }
            }
            if (allOptions.length > 0) {
              serviceSpecialties[service] = allOptions;
            }
          }
        }
        if (Object.keys(serviceSpecialties).length === 0) {
          serviceSpecialties = null;
        }
      }

      // Transform call_preferences array to comma-separated string
      const updateData = {
        ...values,
        service_specialties: serviceSpecialties,
        call_preferences: values.call_preferences?.length > 0
          ? values.call_preferences.join(', ')
          : null,
        // Convert empty strings to null
        website: values.website || null,
        location: values.location || null,
        qualifications: values.qualifications || null,
        social_instagram: values.social_instagram || null,
        social_facebook: values.social_facebook || null,
        social_linkedin: values.social_linkedin || null,
        referral_source: values.referral_source || null,
        referral_source_name: values.referral_source_name || null,
        admin_notes: values.admin_notes || null,
      };

      const response = await fetch(`/api/admin/applications/${selectedApp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        message.success('Changes saved');
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

  const handleDelete = async () => {
    if (!appToDelete) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/applications/${appToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        message.success('Application deleted');
        setDeleteModalOpen(false);
        setAppToDelete(null);
        fetchApplications();
      } else {
        throw new Error('Failed to delete application');
      }
    } catch {
      message.error('Failed to delete application');
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
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              setAppToDelete(record);
              setDeleteModalOpen(true);
            }}
          />
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
        width={800}
        footer={[
          <Button
            key="save"
            icon={<SaveOutlined />}
            onClick={handleSaveChanges}
            loading={saving}
          >
            Save Changes
          </Button>,
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
          <Form form={form} layout="vertical">
            {/* Personal Info - Read Only */}
            <Divider orientationMargin={0}>Personal Info (Read Only)</Divider>
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
            </Descriptions>

            {/* Editable Business Info */}
            <Divider orientationMargin={0}>Business Info</Divider>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item label="Website" name="website">
                <Input placeholder="Website URL" />
              </Form.Item>
              <Form.Item label="Location" name="location">
                <Input placeholder="Business location" />
              </Form.Item>
            </div>

            {/* Services */}
            <Form.Item label="Services" name="services">
              <Select
                mode="multiple"
                placeholder="Select services"
                options={Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
                onChange={(values: ServiceCategory[]) => setSelectedServices(values)}
              />
            </Form.Item>

            {/* Service Specialties (Editable) */}
            {serviceClassifications.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Service Specialties</Text>
                {serviceClassifications.map(({ service, label, classifications }) => (
                  <div
                    key={service}
                    style={{
                      marginBottom: 12,
                      padding: 12,
                      background: '#f5f5f5',
                      borderRadius: 8,
                    }}
                  >
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>{label}</Text>
                    {classifications.map(classification => (
                      <Form.Item
                        key={`${service}_${classification.label}`}
                        name={['service_specialties', service, classification.label]}
                        label={classification.label}
                        style={{ marginBottom: 8 }}
                      >
                        <Select
                          mode="multiple"
                          placeholder={`Select ${classification.label.toLowerCase()}`}
                          options={classification.options.map(opt => ({ value: opt, label: opt }))}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Service Areas */}
            <Form.Item label="Service Areas" name="service_areas">
              <ServiceAreaAutocomplete
                value={form.getFieldValue('service_areas') || []}
                onChange={(values) => form.setFieldValue('service_areas', values)}
              />
            </Form.Item>

            {/* Qualifications */}
            <Divider orientationMargin={0}>Qualifications</Divider>
            <Space size="large">
              <Form.Item name="licensed" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Checkbox>Licensed</Checkbox>
              </Form.Item>
              <Form.Item name="insured" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Checkbox>Insured</Checkbox>
              </Form.Item>
              <Form.Item name="rental_experience" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Checkbox>Rental Experience</Checkbox>
              </Form.Item>
            </Space>

            <Form.Item label="Licensed Areas" name="licensed_areas" style={{ marginTop: 16 }}>
              <ServiceAreaAutocomplete
                value={form.getFieldValue('licensed_areas') || []}
                onChange={(values) => form.setFieldValue('licensed_areas', values)}
              />
            </Form.Item>

            <Form.Item label="Experience & Qualifications" name="qualifications">
              <TextArea rows={3} placeholder="Describe experience and qualifications..." />
            </Form.Item>

            {/* Business Details */}
            <Divider orientationMargin={0}>Business Details</Divider>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item label="Years in Business" name="years_in_business">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Employees" name="employee_count">
                <Select
                  placeholder="Select range"
                  allowClear
                  options={EMPLOYEE_COUNT_OPTIONS}
                />
              </Form.Item>
            </div>

            <Form.Item name="emergency_services" valuePropName="checked">
              <Checkbox>Offers Emergency Services (24/7)</Checkbox>
            </Form.Item>

            <Form.Item label="Job Size Range" name="job_size_range">
              <Select
                mode="multiple"
                placeholder="Select job sizes"
                options={JOB_SIZE_RANGE_OPTIONS}
              />
            </Form.Item>

            {/* Service Hours */}
            <Divider orientationMargin={0}>Service Hours</Divider>
            <Space size="large">
              <Form.Item name="service_hours_weekdays" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Checkbox>Weekdays</Checkbox>
              </Form.Item>
              <Form.Item name="service_hours_weekends" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Checkbox>Weekends</Checkbox>
              </Form.Item>
              <Form.Item name="service_hours_24_7" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Checkbox>24/7 Available</Checkbox>
              </Form.Item>
            </Space>

            {/* Accepted Payments */}
            <Form.Item label="Accepted Payments" name="accepted_payments" style={{ marginTop: 16 }}>
              <Select
                mode="multiple"
                placeholder="Select payment methods"
                options={ACCEPTED_PAYMENTS_OPTIONS}
              />
            </Form.Item>

            {/* Contact Preferences */}
            <Divider orientationMargin={0}>Contact Preferences</Divider>
            <Form.Item label="Best Way to Reach" name="call_preferences">
              <Select
                mode="multiple"
                placeholder="Select contact methods"
                options={Object.entries(CONTACT_PREFERENCE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </Form.Item>

            {/* Social Media */}
            <Divider orientationMargin={0}>Social Media</Divider>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <Form.Item name="social_instagram">
                <Input prefix={<InstagramOutlined />} placeholder="Instagram" />
              </Form.Item>
              <Form.Item name="social_facebook">
                <Input prefix={<FacebookOutlined />} placeholder="Facebook" />
              </Form.Item>
              <Form.Item name="social_linkedin">
                <Input prefix={<LinkedinOutlined />} placeholder="LinkedIn" />
              </Form.Item>
            </div>

            {/* Referral */}
            <Divider orientationMargin={0}>Referral Info</Divider>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item label="How They Found Us" name="referral_source">
                <Select
                  placeholder="Select source"
                  allowClear
                  options={REFERRAL_SOURCE_OPTIONS}
                />
              </Form.Item>
              <Form.Item label="Referrer Name" name="referral_source_name">
                <Input placeholder="Name of person who referred" />
              </Form.Item>
            </div>

            {/* Admin Notes */}
            <Divider orientationMargin={0}>Admin Notes</Divider>
            <Form.Item name="admin_notes">
              <TextArea rows={4} placeholder="Add internal notes about this application..." />
            </Form.Item>
          </Form>
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

      {/* Delete Confirmation Modal */}
      <Modal
        title="Delete Application"
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setAppToDelete(null);
        }}
        onOk={handleDelete}
        confirmLoading={processing}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <Text>
          Are you sure you want to delete the application from{' '}
          <strong>{appToDelete?.business_name}</strong>? This action cannot be undone.
        </Text>
      </Modal>

    </div>
  );
}

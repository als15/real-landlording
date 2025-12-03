'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Table,
  Card,
  Tag,
  Space,
  Button,
  Select,
  Input,
  Typography,
  Drawer,
  Descriptions,
  Divider,
  message,
  Badge,
  Modal,
  Form,
  Checkbox,
  Rate,
} from 'antd';
import {
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import {
  Vendor,
  VendorStatus,
  VENDOR_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
  ServiceType,
} from '@/types/database';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Search, TextArea } = Input;

const statusColors: Record<VendorStatus, string> = {
  active: 'green',
  inactive: 'default',
  pending_review: 'orange',
  rejected: 'red',
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((page - 1) * pageSize).toString(),
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/vendors?${params}`);
      if (response.ok) {
        const { data, count } = await response.json();
        setVendors(data || []);
        setTotal(count || 0);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      message.error('Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const handleViewVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setDrawerOpen(true);
  };

  const handleStatusChange = async (vendorId: string, newStatus: VendorStatus) => {
    try {
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        message.success('Status updated');
        fetchVendors();
        if (selectedVendor?.id === vendorId) {
          setSelectedVendor({ ...selectedVendor, status: newStatus });
        }
      } else {
        throw new Error('Failed to update status');
      }
    } catch {
      message.error('Failed to update status');
    }
  };

  const handleAddVendor = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success('Vendor added successfully');
        setAddModalOpen(false);
        form.resetFields();
        fetchVendors();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add vendor');
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
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
      width: 200,
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <div>
          <div>{record.email}</div>
          {record.phone && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.phone}
            </Text>
          )}
        </div>
      ),
      width: 200,
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
      width: 200,
    },
    {
      title: 'Rating',
      key: 'rating',
      render: (_, record) => (
        <Space>
          <Rate disabled defaultValue={record.performance_score} allowHalf style={{ fontSize: 14 }} />
          <Text type="secondary">({record.total_reviews})</Text>
        </Space>
      ),
      width: 180,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status as VendorStatus]}>
          {VENDOR_STATUS_LABELS[status as VendorStatus]}
        </Tag>
      ),
      width: 120,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewVendor(record)}
          />
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleViewVendor(record)}
          />
        </Space>
      ),
      width: 100,
    },
  ];

  const filteredVendors = vendors.filter((vendor) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      vendor.business_name.toLowerCase().includes(term) ||
      vendor.contact_name.toLowerCase().includes(term) ||
      vendor.email.toLowerCase().includes(term)
    );
  });

  const serviceOptions = Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Vendors
          <Badge count={total} style={{ marginLeft: 12 }} showZero />
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchVendors}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
            Add Vendor
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <FilterOutlined />
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 160 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={Object.entries(VENDOR_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Search
            placeholder="Search vendors..."
            allowClear
            style={{ width: 300 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredVendors}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
            showSizeChanger: true,
            showTotal: (t) => `${t} vendors`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Vendor Details Drawer */}
      <Drawer
        title="Vendor Details"
        placement="right"
        width={600}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
      >
        {selectedVendor && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Status">
                <Select
                  value={selectedVendor.status}
                  style={{ width: 150 }}
                  onChange={(value) => handleStatusChange(selectedVendor.id, value)}
                  options={Object.entries(VENDOR_STATUS_LABELS).map(([v, l]) => ({
                    value: v,
                    label: l,
                  }))}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Business Name">
                {selectedVendor.business_name}
              </Descriptions.Item>
              <Descriptions.Item label="Contact Name">
                {selectedVendor.contact_name}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {selectedVendor.email}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {selectedVendor.phone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Website">
                {selectedVendor.website ? (
                  <a href={selectedVendor.website} target="_blank" rel="noopener noreferrer">
                    {selectedVendor.website}
                  </a>
                ) : '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider>Services</Divider>

            <Space wrap>
              {selectedVendor.services.map((s) => (
                <Tag key={s} color="blue">
                  {SERVICE_TYPE_LABELS[s as keyof typeof SERVICE_TYPE_LABELS] || s}
                </Tag>
              ))}
            </Space>

            <Divider>Service Areas</Divider>

            <Space wrap>
              {selectedVendor.service_areas.map((area) => (
                <Tag key={area}>{area}</Tag>
              ))}
            </Space>

            <Divider>Qualifications</Divider>

            <Descriptions column={2} size="small">
              <Descriptions.Item label="Licensed">
                {selectedVendor.licensed ? 'Yes' : 'No'}
              </Descriptions.Item>
              <Descriptions.Item label="Insured">
                {selectedVendor.insured ? 'Yes' : 'No'}
              </Descriptions.Item>
              <Descriptions.Item label="Rental Experience">
                {selectedVendor.rental_experience ? 'Yes' : 'No'}
              </Descriptions.Item>
            </Descriptions>

            {selectedVendor.qualifications && (
              <>
                <Divider>Qualifications Details</Divider>
                <Text>{selectedVendor.qualifications}</Text>
              </>
            )}

            <Divider>Performance</Divider>

            <Space>
              <Rate disabled defaultValue={selectedVendor.performance_score} allowHalf />
              <Text>({selectedVendor.total_reviews} reviews)</Text>
            </Space>

            {selectedVendor.admin_notes && (
              <>
                <Divider>Admin Notes</Divider>
                <Text>{selectedVendor.admin_notes}</Text>
              </>
            )}
          </>
        )}
      </Drawer>

      {/* Add Vendor Modal */}
      <Modal
        title="Add New Vendor"
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleAddVendor}>
          <Title level={5}>Contact Information</Title>
          <Form.Item
            name="contact_name"
            label="Contact Name"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="John Smith" />
          </Form.Item>

          <Form.Item
            name="business_name"
            label="Business Name"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="Smith Plumbing LLC" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Required' },
              { type: 'email', message: 'Invalid email' },
            ]}
          >
            <Input placeholder="john@smithplumbing.com" />
          </Form.Item>

          <Form.Item name="phone" label="Phone">
            <Input placeholder="(215) 555-0123" />
          </Form.Item>

          <Form.Item name="website" label="Website">
            <Input placeholder="https://smithplumbing.com" />
          </Form.Item>

          <Divider />
          <Title level={5}>Services</Title>

          <Form.Item
            name="services"
            label="Services Offered"
            rules={[{ required: true, message: 'Select at least one service' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select services"
              options={serviceOptions}
            />
          </Form.Item>

          <Form.Item
            name="service_areas"
            label="Service Areas (Zip Codes)"
            rules={[{ required: true, message: 'Enter at least one zip code' }]}
            extra="Enter zip codes separated by commas"
          >
            <Select
              mode="tags"
              placeholder="19103, 19104, 19106"
              tokenSeparators={[',']}
            />
          </Form.Item>

          <Divider />
          <Title level={5}>Qualifications</Title>

          <Space>
            <Form.Item name="licensed" valuePropName="checked">
              <Checkbox>Licensed</Checkbox>
            </Form.Item>
            <Form.Item name="insured" valuePropName="checked">
              <Checkbox>Insured</Checkbox>
            </Form.Item>
            <Form.Item name="rental_experience" valuePropName="checked">
              <Checkbox>Rental Property Experience</Checkbox>
            </Form.Item>
          </Space>

          <Form.Item name="qualifications" label="Additional Qualifications">
            <TextArea rows={3} placeholder="Certifications, years of experience, etc." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Add Vendor
              </Button>
              <Button onClick={() => setAddModalOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

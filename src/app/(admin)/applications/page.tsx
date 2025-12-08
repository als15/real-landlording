'use client';

import { useEffect, useState, useCallback } from 'react';
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
} from '@ant-design/icons';
import {
  Vendor,
  SERVICE_TYPE_LABELS,
} from '@/types/database';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Vendor | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const { message } = App.useApp();

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/applications');
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
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleViewApp = (app: Vendor) => {
    setSelectedApp(app);
    setDetailModalOpen(true);
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
        <Button icon={<ReloadOutlined />} onClick={fetchApplications}>
          Refresh
        </Button>
      </div>

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

            <Divider>Services</Divider>
            <Space wrap>
              {selectedApp.services.map((s) => (
                <Tag key={s} color="blue">
                  {SERVICE_TYPE_LABELS[s as keyof typeof SERVICE_TYPE_LABELS] || s}
                </Tag>
              ))}
            </Space>

            <Divider>Service Areas</Divider>
            <Space wrap>
              {selectedApp.service_areas.map((area) => (
                <Tag key={area}>{area}</Tag>
              ))}
            </Space>

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

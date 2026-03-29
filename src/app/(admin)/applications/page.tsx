'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  Card,
  Tag,
  Space,
  Button,
  Typography,
  Modal,
  Badge,
  Input,
} from 'antd';
import { useNotify } from '@/hooks/useNotify';
import {
  ReloadOutlined,
  CheckOutlined,
  EyeOutlined,
  SearchOutlined,
  DownloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { Vendor } from '@/types/database';
import { useServiceTaxonomy } from '@/hooks/useServiceTaxonomy';
import {
  objectsToCsv,
  downloadCsv,
  formatDateTimeForCsv,
  formatArrayForCsv,
  formatBooleanForCsv,
} from '@/lib/utils/csv-export';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Search } = Input;

export default function ApplicationsPage() {
  const router = useRouter();
  const { labels: SERVICE_TYPE_LABELS } = useServiceTaxonomy();
  const [applications, setApplications] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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

  const handleDelete = (app: Vendor) => {
    Modal.confirm({
      title: 'Delete Application',
      content: `Are you sure you want to delete the application from "${app.business_name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const response = await fetch(`/api/admin/applications/${app.id}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            message.success('Application deleted');
            fetchApplications();
          } else {
            throw new Error('Failed to delete application');
          }
        } catch {
          message.error('Failed to delete application');
        }
      },
    });
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
              {SERVICE_TYPE_LABELS[s] || s}
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
            onClick={() => router.push(`/applications/${record.id}`)}
          >
            Review
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            loading={processing}
            onClick={() => handleApprove(record.id)}
          >
            Approve
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
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
          onRow={(record) => ({
            onClick: () => router.push(`/applications/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>
    </div>
  );
}

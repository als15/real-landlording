'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Table,
  Card,
  Tag,
  Space,
  Button,
  Typography,
  App,
  Badge,
  Tooltip,
  Input,
  Select,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SendOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Search } = Input;

interface Email {
  id: string;
  from: string;
  to: string[];
  subject: string;
  created_at: string;
  last_event?: string;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  delivered: { color: 'success', icon: <CheckCircleOutlined />, label: 'Delivered' },
  sent: { color: 'processing', icon: <SendOutlined />, label: 'Sent' },
  bounced: { color: 'error', icon: <CloseCircleOutlined />, label: 'Bounced' },
  complained: { color: 'warning', icon: <CloseCircleOutlined />, label: 'Complained' },
  pending: { color: 'default', icon: <ClockCircleOutlined />, label: 'Pending' },
};

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const { message } = App.useApp();

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/emails');
      if (response.ok) {
        const { data } = await response.json();
        // Sort by created_at descending (most recent first)
        const sorted = (data || []).sort((a: Email, b: Email) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setEmails(sorted);
      } else {
        throw new Error('Failed to fetch emails');
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
      message.error('Failed to fetch emails');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Filter emails based on search and status
  const filteredEmails = useMemo(() => {
    return emails.filter(email => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesTo = email.to.some(t => t.toLowerCase().includes(search));
        const matchesSubject = email.subject?.toLowerCase().includes(search);
        const matchesFrom = email.from?.toLowerCase().includes(search);
        if (!matchesTo && !matchesSubject && !matchesFrom) {
          return false;
        }
      }
      // Status filter
      if (statusFilter) {
        const emailStatus = email.last_event || 'sent';
        if (emailStatus !== statusFilter) {
          return false;
        }
      }
      return true;
    });
  }, [emails, searchTerm, statusFilter]);

  const columns: ColumnsType<Email> = [
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_, record) => {
        const status = record.last_event || 'sent';
        const config = statusConfig[status] || statusConfig.pending;
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: 'To',
      dataIndex: 'to',
      key: 'to',
      render: (to: string[]) => (
        <div>
          {to.map((email, i) => (
            <div key={i}>
              <Text copyable={{ text: email }} style={{ fontSize: 13 }}>
                {email}
              </Text>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
      render: (subject: string) => (
        <Tooltip title={subject}>
          <Text>{subject}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'From',
      dataIndex: 'from',
      key: 'from',
      width: 200,
      ellipsis: true,
      render: (from: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {from}
        </Text>
      ),
    },
    {
      title: 'Sent',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => {
        const d = new Date(date);
        return (
          <Tooltip title={d.toLocaleString()}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Tooltip>
        );
      },
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      defaultSortOrder: 'descend',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Sent Emails
          <Badge count={filteredEmails.length} style={{ marginLeft: 12 }} showZero />
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchEmails}>
            Refresh
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <SearchOutlined />
          <Search
            placeholder="Search by recipient, subject, or sender..."
            allowClear
            style={{ width: 350 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 150 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'delivered', label: 'Delivered' },
              { value: 'sent', label: 'Sent' },
              { value: 'bounced', label: 'Bounced' },
              { value: 'complained', label: 'Complained' },
            ]}
          />
          {(searchTerm || statusFilter) && (
            <Button type="link" onClick={() => { setSearchTerm(''); setStatusFilter(null); }}>
              Clear filters
            </Button>
          )}
        </Space>
      </Card>

      <Card size="small" style={{ marginBottom: 16, background: '#fffbe6', border: '1px solid #ffe58f' }}>
        <Text type="secondary">
          Showing emails from the last 7 days (Resend API limit). For full history, check your Resend dashboard.
        </Text>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredEmails}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} emails` }}
          locale={{ emptyText: 'No emails found' }}
        />
      </Card>
    </div>
  );
}

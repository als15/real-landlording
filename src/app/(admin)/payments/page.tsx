'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Select,
  Input,
  Typography,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  App,
  Statistic,
  Row,
  Col,
  Descriptions,
  Drawer,
} from 'antd';
import {
  ReloadOutlined,
  PlusOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import {
  PaymentStatus,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_OPTIONS,
  SERVICE_TYPE_LABELS,
} from '@/types/database';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { objectsToCsv, downloadCsv, formatDateTimeForCsv } from '@/lib/utils/csv-export';

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;

interface Payment {
  id: string;
  match_id: string | null;
  vendor_id: string | null;
  request_id: string | null;
  amount: number;
  fee_type: 'fixed' | 'percentage';
  fee_percentage: number | null;
  job_cost: number | null;
  status: PaymentStatus;
  invoice_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vendor: {
    id: string;
    business_name: string;
    contact_name: string;
    email: string;
  } | null;
  request: {
    id: string;
    service_type: string;
    property_address: string | null;
    zip_code: string | null;
    landlord_name: string | null;
    landlord_email: string;
  } | null;
  match: {
    id: string;
    status: string;
    job_completed: boolean | null;
  } | null;
}

interface PaymentSummary {
  pending: number;
  pendingAmount: number;
  paid: number;
  paidAmount: number;
  overdue: number;
  overdueAmount: number;
  thisMonth: number;
  thisMonthAmount: number;
}

const statusColors: Record<PaymentStatus, string> = {
  pending: 'orange',
  invoiced: 'blue',
  paid: 'green',
  overdue: 'red',
  waived: 'default',
  refunded: 'purple',
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/admin/payments?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments);
        setTotal(data.total);
        setSummary(data.summary);
      } else {
        message.error('Failed to fetch payments');
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      message.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, message]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleRefresh = () => {
    fetchPayments();
  };

  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setDrawerOpen(true);
  };

  const handleEditPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    form.setFieldsValue({
      amount: payment.amount,
      fee_type: payment.fee_type,
      job_cost: payment.job_cost,
      status: payment.status,
      invoice_date: payment.invoice_date ? dayjs(payment.invoice_date) : null,
      due_date: payment.due_date ? dayjs(payment.due_date) : null,
      paid_date: payment.paid_date ? dayjs(payment.paid_date) : null,
      payment_method: payment.payment_method,
      payment_reference: payment.payment_reference,
      notes: payment.notes,
    });
    setEditModalOpen(true);
  };

  const handleMarkPaid = async (payment: Payment) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/payments/${payment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paid',
          paid_date: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        message.success('Payment marked as paid');
        fetchPayments();
      } else {
        message.error('Failed to update payment');
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      message.error('Failed to update payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePayment = (payment: Payment) => {
    modal.confirm({
      title: 'Delete Payment',
      content: `Are you sure you want to delete this payment of $${payment.amount}?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const response = await fetch(`/api/admin/payments/${payment.id}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            message.success('Payment deleted');
            fetchPayments();
          } else {
            message.error('Failed to delete payment');
          }
        } catch (error) {
          console.error('Error deleting payment:', error);
          message.error('Failed to delete payment');
        }
      },
    });
  };

  const handleCreatePayment = async (values: {
    vendor_id?: string;
    amount: number;
    fee_type: 'fixed' | 'percentage';
    job_cost?: number;
    status: PaymentStatus;
    invoice_date?: dayjs.Dayjs;
    due_date?: dayjs.Dayjs;
    payment_method?: string;
    notes?: string;
  }) => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          invoice_date: values.invoice_date?.toISOString(),
          due_date: values.due_date?.toISOString(),
        }),
      });

      if (response.ok) {
        message.success('Payment created');
        setCreateModalOpen(false);
        form.resetFields();
        fetchPayments();
      } else {
        const data = await response.json();
        message.error(data.message || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      message.error('Failed to create payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePayment = async (values: {
    amount: number;
    fee_type: 'fixed' | 'percentage';
    job_cost?: number;
    status: PaymentStatus;
    invoice_date?: dayjs.Dayjs;
    due_date?: dayjs.Dayjs;
    paid_date?: dayjs.Dayjs;
    payment_method?: string;
    payment_reference?: string;
    notes?: string;
  }) => {
    if (!selectedPayment) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/payments/${selectedPayment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          invoice_date: values.invoice_date?.toISOString(),
          due_date: values.due_date?.toISOString(),
          paid_date: values.paid_date?.toISOString(),
        }),
      });

      if (response.ok) {
        message.success('Payment updated');
        setEditModalOpen(false);
        form.resetFields();
        fetchPayments();
      } else {
        message.error('Failed to update payment');
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      message.error('Failed to update payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csvColumns = [
      { key: 'id', header: 'Payment ID' },
      { key: 'vendor_name', header: 'Vendor' },
      { key: 'vendor_contact', header: 'Vendor Contact' },
      { key: 'service_type', header: 'Service Type' },
      { key: 'landlord', header: 'Landlord' },
      { key: 'amount', header: 'Amount' },
      { key: 'job_cost', header: 'Job Cost' },
      { key: 'status', header: 'Status' },
      { key: 'invoice_date', header: 'Invoice Date' },
      { key: 'due_date', header: 'Due Date' },
      { key: 'paid_date', header: 'Paid Date' },
      { key: 'payment_method', header: 'Payment Method' },
      { key: 'payment_reference', header: 'Reference' },
      { key: 'notes', header: 'Notes' },
      { key: 'created_at', header: 'Created' },
    ];

    const csvData = payments.map((p) => ({
      id: p.id,
      vendor_name: p.vendor?.business_name || 'N/A',
      vendor_contact: p.vendor?.contact_name || 'N/A',
      service_type: p.request?.service_type || 'N/A',
      landlord: p.request?.landlord_name || 'N/A',
      amount: p.amount,
      job_cost: p.job_cost || '',
      status: PAYMENT_STATUS_LABELS[p.status],
      invoice_date: p.invoice_date ? formatDateTimeForCsv(p.invoice_date) : '',
      due_date: p.due_date ? formatDateTimeForCsv(p.due_date) : '',
      paid_date: p.paid_date ? formatDateTimeForCsv(p.paid_date) : '',
      payment_method: p.payment_method || '',
      payment_reference: p.payment_reference || '',
      notes: p.notes || '',
      created_at: formatDateTimeForCsv(p.created_at),
    }));

    const csv = objectsToCsv(csvData, csvColumns);
    downloadCsv(csv, `payments-export-${dayjs().format('YYYY-MM-DD')}`);
    message.success('Exported to CSV');
  };

  const columns: ColumnsType<Payment> = [
    {
      title: 'Vendor',
      key: 'vendor',
      width: 200,
      render: (_, record) => (
        <div>
          <Text strong>{record.vendor?.business_name || 'N/A'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.vendor?.contact_name || ''}
          </Text>
        </div>
      ),
    },
    {
      title: 'Job',
      key: 'job',
      width: 180,
      render: (_, record) => (
        <div>
          <Text>{SERVICE_TYPE_LABELS[record.request?.service_type as keyof typeof SERVICE_TYPE_LABELS] || record.request?.service_type || 'N/A'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.request?.landlord_name || record.request?.landlord_email || 'N/A'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Amount',
      key: 'amount',
      width: 100,
      render: (_, record) => (
        <Text strong style={{ color: '#52c41a' }}>${record.amount}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (status: PaymentStatus) => (
        <Tag color={statusColors[status]}>{PAYMENT_STATUS_LABELS[status]}</Tag>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      width: 100,
      render: (date: string | null) => (
        date ? (
          <Text type={dayjs(date).isBefore(dayjs()) ? 'danger' : 'secondary'}>
            {dayjs(date).format('MMM D, YYYY')}
          </Text>
        ) : '-'
      ),
    },
    {
      title: 'Paid Date',
      dataIndex: 'paid_date',
      width: 100,
      render: (date: string | null) => (
        date ? dayjs(date).format('MMM D, YYYY') : '-'
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewPayment(record)}
          />
          {record.status !== 'paid' && (
            <Button
              type="text"
              size="small"
              icon={<CheckCircleOutlined />}
              style={{ color: '#52c41a' }}
              onClick={() => handleMarkPaid(record)}
              loading={actionLoading}
            />
          )}
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditPayment(record)}
          />
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleDeletePayment(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Payments</Title>
          <Text type="secondary">Track vendor referral payments</Text>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExportCSV}>
            Export CSV
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            Record Payment
          </Button>
        </Space>
      </div>

      {/* Summary Cards */}
      {summary && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Pending"
                value={summary.pending}
                prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                suffix={<Text type="secondary" style={{ fontSize: 12 }}>${summary.pendingAmount.toFixed(2)}</Text>}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="This Month"
                value={summary.thisMonth}
                prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                suffix={<Text type="secondary" style={{ fontSize: 12 }}>${summary.thisMonthAmount.toFixed(2)}</Text>}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Total Paid"
                value={summary.paid}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                suffix={<Text type="secondary" style={{ fontSize: 12 }}>${summary.paidAmount.toFixed(2)}</Text>}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Overdue"
                value={summary.overdue}
                prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                suffix={<Text type="secondary" style={{ fontSize: 12 }}>${summary.overdueAmount.toFixed(2)}</Text>}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            style={{ width: 150 }}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Status"
            allowClear
            options={[
              { value: '', label: 'All Statuses' },
              ...Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            Refresh
          </Button>
        </Space>
      </Card>

      {/* Payments Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={payments}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (total) => `${total} payments`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          size="small"
        />
      </Card>

      {/* Payment Detail Drawer */}
      <Drawer
        title="Payment Details"
        placement="right"
        width={500}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {selectedPayment && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Amount">
                <Text strong style={{ fontSize: 18, color: '#52c41a' }}>${selectedPayment.amount}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColors[selectedPayment.status]}>
                  {PAYMENT_STATUS_LABELS[selectedPayment.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Fee Type">
                {selectedPayment.fee_type === 'fixed' ? 'Fixed Amount' : 'Percentage'}
              </Descriptions.Item>
              {selectedPayment.job_cost && (
                <Descriptions.Item label="Job Cost">
                  ${selectedPayment.job_cost}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Invoice Date">
                {selectedPayment.invoice_date
                  ? dayjs(selectedPayment.invoice_date).format('MMM D, YYYY')
                  : 'Not set'}
              </Descriptions.Item>
              <Descriptions.Item label="Due Date">
                {selectedPayment.due_date
                  ? dayjs(selectedPayment.due_date).format('MMM D, YYYY')
                  : 'Not set'}
              </Descriptions.Item>
              <Descriptions.Item label="Paid Date">
                {selectedPayment.paid_date
                  ? dayjs(selectedPayment.paid_date).format('MMM D, YYYY')
                  : 'Not paid'}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Method">
                {selectedPayment.payment_method || 'Not specified'}
              </Descriptions.Item>
              <Descriptions.Item label="Reference">
                {selectedPayment.payment_reference || 'None'}
              </Descriptions.Item>
            </Descriptions>

            {selectedPayment.vendor && (
              <>
                <Title level={5} style={{ marginTop: 24 }}>Vendor</Title>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Business">
                    {selectedPayment.vendor.business_name}
                  </Descriptions.Item>
                  <Descriptions.Item label="Contact">
                    {selectedPayment.vendor.contact_name}
                  </Descriptions.Item>
                  <Descriptions.Item label="Email">
                    {selectedPayment.vendor.email}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            {selectedPayment.request && (
              <>
                <Title level={5} style={{ marginTop: 24 }}>Job</Title>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Service">
                    {SERVICE_TYPE_LABELS[selectedPayment.request.service_type as keyof typeof SERVICE_TYPE_LABELS] || selectedPayment.request.service_type}
                  </Descriptions.Item>
                  <Descriptions.Item label="Property">
                    {selectedPayment.request.property_address || 'N/A'} {selectedPayment.request.zip_code}
                  </Descriptions.Item>
                  <Descriptions.Item label="Landlord">
                    {selectedPayment.request.landlord_name || selectedPayment.request.landlord_email}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            {selectedPayment.notes && (
              <>
                <Title level={5} style={{ marginTop: 24 }}>Notes</Title>
                <Text>{selectedPayment.notes}</Text>
              </>
            )}

            <div style={{ marginTop: 24 }}>
              <Space>
                {selectedPayment.status !== 'paid' && (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => {
                      handleMarkPaid(selectedPayment);
                      setDrawerOpen(false);
                    }}
                  >
                    Mark as Paid
                  </Button>
                )}
                <Button icon={<EditOutlined />} onClick={() => {
                  setDrawerOpen(false);
                  handleEditPayment(selectedPayment);
                }}>
                  Edit
                </Button>
              </Space>
            </div>
          </>
        )}
      </Drawer>

      {/* Create Payment Modal */}
      <Modal
        title="Record New Payment"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreatePayment}>
          <Form.Item
            name="amount"
            label="Amount ($)"
            rules={[{ required: true, message: 'Please enter amount' }]}
          >
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              prefix="$"
            />
          </Form.Item>
          <Form.Item
            name="fee_type"
            label="Fee Type"
            initialValue="fixed"
          >
            <Select
              options={[
                { value: 'fixed', label: 'Fixed Amount' },
                { value: 'percentage', label: 'Percentage' },
              ]}
            />
          </Form.Item>
          <Form.Item name="job_cost" label="Job Cost (Optional)">
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              prefix="$"
              placeholder="What landlord paid vendor"
            />
          </Form.Item>
          <Form.Item
            name="status"
            label="Status"
            initialValue="pending"
          >
            <Select
              options={Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Form.Item>
          <Form.Item name="invoice_date" label="Invoice Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="due_date" label="Due Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="payment_method" label="Payment Method">
            <Select
              options={PAYMENT_METHOD_OPTIONS}
              placeholder="Select method"
              allowClear
            />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Optional notes" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={actionLoading}>
                Create Payment
              </Button>
              <Button onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Payment Modal */}
      <Modal
        title="Edit Payment"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdatePayment}>
          <Form.Item
            name="amount"
            label="Amount ($)"
            rules={[{ required: true, message: 'Please enter amount' }]}
          >
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              prefix="$"
            />
          </Form.Item>
          <Form.Item name="fee_type" label="Fee Type">
            <Select
              options={[
                { value: 'fixed', label: 'Fixed Amount' },
                { value: 'percentage', label: 'Percentage' },
              ]}
            />
          </Form.Item>
          <Form.Item name="job_cost" label="Job Cost (Optional)">
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              prefix="$"
            />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select
              options={Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Form.Item>
          <Form.Item name="invoice_date" label="Invoice Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="due_date" label="Due Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="paid_date" label="Paid Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="payment_method" label="Payment Method">
            <Select
              options={PAYMENT_METHOD_OPTIONS}
              placeholder="Select method"
              allowClear
            />
          </Form.Item>
          <Form.Item name="payment_reference" label="Reference / Transaction ID">
            <Input placeholder="Check number, transaction ID, etc." />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={actionLoading}>
                Update Payment
              </Button>
              <Button onClick={() => setEditModalOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

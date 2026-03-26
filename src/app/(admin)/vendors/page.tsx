'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Table, Card, Tag, Space, Button, Select, Input, Typography, Divider, Badge, Modal, Form, Checkbox, Rate, Spin, Pagination } from 'antd'
import { useNotify } from '@/hooks/useNotify'
import { ReloadOutlined, PlusOutlined, FilterOutlined, DownloadOutlined, SendOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, DeleteOutlined } from '@ant-design/icons'
import { Vendor, VendorStatus, SlaStatus, VENDOR_STATUS_LABELS, SLA_STATUS_LABELS, REFERRAL_FEE_TYPE_LABELS, REFERRAL_CALCULATION_BASIS_LABELS, REFERRAL_FEE_TRIGGER_LABELS } from '@/types/database'
import { useServiceTaxonomy } from '@/hooks/useServiceTaxonomy'
import type { ColumnsType } from 'antd/es/table'
import ServiceAreaAutocomplete from '@/components/ServiceAreaAutocomplete'
import { statusColors } from '@/components/admin/vendors/constants'
import {
  objectsToCsv,
  downloadCsv,
  formatDateTimeForCsv,
  formatArrayForCsv,
  formatBooleanForCsv,
} from '@/lib/utils/csv-export'

const { Title, Text } = Typography
const { Search, TextArea } = Input

export default function VendorsPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Spin size="large" /></div>}>
      <VendorsPageContent />
    </Suspense>
  )
}

function VendorsPageContent() {
  const { labels: SERVICE_TYPE_LABELS, categories: serviceCategoriesRaw, groups: serviceGroupsRaw } = useServiceTaxonomy()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortField, setSortField] = useState<string>('business_name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const { message } = useNotify()
  const router = useRouter()

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchTerm])

  const fetchVendors = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((page - 1) * pageSize).toString(),
        sortField,
        sortOrder
      })

      if (statusFilter) {
        params.append('status', statusFilter)
      }

      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim())
      }

      const response = await fetch(`/api/vendors?${params}`)
      if (response.ok) {
        const { data, count } = await response.json()
        setVendors(data || [])
        setTotal(count || 0)
      }
    } catch (error) {
      console.error('Error fetching vendors:', error)
      message.error('Please try refreshing the page.')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter, debouncedSearch, sortField, sortOrder])

  useEffect(() => {
    fetchVendors()
  }, [fetchVendors])

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams({ limit: '10000', offset: '0' })
      if (statusFilter) params.append('status', statusFilter)
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim())

      const response = await fetch(`/api/vendors?${params}`)
      if (!response.ok) throw new Error('Failed to fetch data')

      const { data } = await response.json()

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
        { key: 'status', header: 'Status', formatter: (v) => VENDOR_STATUS_LABELS[v as VendorStatus] || String(v) },
        { key: 'sla_status', header: 'SLA Status', formatter: (v) => SLA_STATUS_LABELS[v as SlaStatus] || 'Not Sent' },
        { key: 'sla_signed_at', header: 'SLA Signed At', formatter: (v) => formatDateTimeForCsv(v as string) },
        { key: 'performance_score', header: 'Performance Score' },
        { key: 'total_reviews', header: 'Total Reviews' },
        { key: 'referral_fee_type', header: 'Referral Fee Type', formatter: (v) => REFERRAL_FEE_TYPE_LABELS[v as string] || String(v) },
        { key: 'referral_fee_percentage', header: 'Referral Fee %' },
        { key: 'referral_fee_flat_amount', header: 'Referral Flat Fee' },
        { key: 'referral_calculation_basis', header: 'Calculation Basis', formatter: (v) => REFERRAL_CALCULATION_BASIS_LABELS[v as string] || String(v) },
        { key: 'referral_fee_trigger', header: 'Fee Trigger', formatter: (v) => REFERRAL_FEE_TRIGGER_LABELS[v as string] || String(v) },
        { key: 'referral_payment_due_days', header: 'Payment Due Days' },
        { key: 'referral_late_fee_enabled', header: 'Late Fee Enabled', formatter: (v) => formatBooleanForCsv(v as boolean) },
        { key: 'referral_terms_version', header: 'Terms Version' },
        { key: 'created_at', header: 'Created', formatter: (v) => formatDateTimeForCsv(v as string) },
      ])

      downloadCsv(csv, `vendors-${new Date().toISOString().split('T')[0]}`)
      message.success('Export complete')
    } catch (error) {
      console.error('Export error:', error)
      message.error('Failed to export vendor data. Please try again.')
    }
  }

  const handleAddVendor = async (values: Record<string, unknown>) => {
    setSubmitting(true)
    try {
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })

      if (response.ok) {
        message.success('Vendor added successfully')
        setAddModalOpen(false)
        form.resetFields()
        fetchVendors()
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to add vendor')
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to add vendor. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusFilterChange = (value: string | null) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleSendSla = async (vendor: Vendor) => {
    try {
      const response = await fetch(`/api/admin/vendors/${vendor.id}/send-sla`, {
        method: 'POST',
      })

      if (response.ok) {
        const result = await response.json()
        message.success('SLA sent successfully')
        const updatedVendor = { ...vendor, sla_status: 'sent' as SlaStatus, sla_envelope_id: result.envelopeId }
        setVendors(prev => prev.map(v => v.id === vendor.id ? updatedVendor : v))
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to send SLA')
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to send SLA. Please try again.')
    }
  }

  const handleResendSla = async (vendor: Vendor) => {
    try {
      const response = await fetch(`/api/admin/vendors/${vendor.id}/resend-sla`, {
        method: 'POST',
      })

      if (response.ok) {
        message.success('SLA notification resent successfully')
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to resend SLA')
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to resend SLA. Please try again.')
    }
  }

  const handleDeleteVendor = (vendor: Vendor) => {
    Modal.confirm({
      title: 'Delete Vendor',
      content: `Are you sure you want to delete "${vendor.business_name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const response = await fetch(`/api/vendors/${vendor.id}`, {
            method: 'DELETE',
          })

          if (response.ok) {
            message.success('Vendor deleted successfully')
            setVendors(prev => prev.filter(v => v.id !== vendor.id))
            setTotal(prev => prev - 1)
          } else {
            const error = await response.json()
            throw new Error(error.message || 'Failed to delete vendor')
          }
        } catch (error) {
          message.error(error instanceof Error ? error.message : 'Failed to delete vendor. Please try again.')
        }
      },
    })
  }

  const columns: ColumnsType<Vendor> = [
    {
      title: 'Business',
      key: 'business_name',
      sorter: true,
      sortOrder: sortField === 'business_name' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
      render: (_, record) => (
        <div>
          <div>{record.business_name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.contact_name}
          </Text>
        </div>
      ),
      width: 200
    },
    {
      title: 'Contact',
      key: 'email',
      sorter: true,
      sortOrder: sortField === 'email' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
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
      width: 200
    },
    {
      title: 'Services',
      dataIndex: 'services',
      key: 'services',
      render: (services: string[]) => (
        <Space wrap size="small">
          {services.slice(0, 2).map(s => (
            <Tag key={s} color="blue">
              {SERVICE_TYPE_LABELS[s] || s}
            </Tag>
          ))}
          {services.length > 2 && <Tag>+{services.length - 2}</Tag>}
        </Space>
      ),
      width: 200
    },
    {
      title: 'Rating',
      key: 'performance_score',
      sorter: true,
      sortOrder: sortField === 'performance_score' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
      render: (_, record) => (
        <Space>
          <Rate disabled defaultValue={record.performance_score} allowHalf style={{ fontSize: 14 }} />
          <Text type="secondary">({record.total_reviews})</Text>
        </Space>
      ),
      width: 180
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      sorter: true,
      sortOrder: sortField === 'status' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
      render: status => <Tag color={statusColors[status as VendorStatus]}>{VENDOR_STATUS_LABELS[status as VendorStatus]}</Tag>,
      width: 120
    },
    {
      title: 'SLA',
      dataIndex: 'sla_status',
      key: 'sla_status',
      render: (slaStatus: SlaStatus | null, record) => {
        const status = slaStatus || 'not_sent'
        if (status === 'signed') {
          return <Tag icon={<CheckCircleOutlined />} color="success">Signed</Tag>
        }
        if (status === 'declined') {
          return <Tag icon={<CloseCircleOutlined />} color="error">Declined</Tag>
        }
        if (status === 'not_sent' && record.status === 'active') {
          return (
            <Button
              size="small"
              type="link"
              icon={<SendOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                handleSendSla(record)
              }}
            >
              Send
            </Button>
          )
        }
        if (['sent', 'delivered', 'viewed'].includes(status)) {
          return (
            <Space size="small">
              <Tag icon={<ClockCircleOutlined />} color="processing">{SLA_STATUS_LABELS[status]}</Tag>
              <Button
                size="small"
                type="link"
                icon={<SendOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  handleResendSla(record)
                }}
              >
                Resend
              </Button>
            </Space>
          )
        }
        return <Tag color="default">{SLA_STATUS_LABELS[status]}</Tag>
      },
      width: 100
    },
    {
      title: '',
      key: 'actions',
      render: (_, record) => (
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={(e) => {
            e.stopPropagation()
            handleDeleteVendor(record)
          }}
          title="Delete"
        />
      ),
      width: 60
    }
  ]

  const groupedCategories = serviceGroupsRaw.map(g => ({
    group: g.key,
    label: g.label,
    categories: serviceCategoriesRaw
      .filter(c => c.group_key === g.key)
      .map(c => ({ value: c.key, label: c.label })),
  }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Vendors
          <Badge count={total} style={{ marginLeft: 12 }} showZero />
        </Title>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExportCsv}>
            Export CSV
          </Button>
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
            onChange={handleStatusFilterChange}
            options={Object.entries(VENDOR_STATUS_LABELS).map(([value, label]) => ({
              value,
              label
            }))}
          />
          <Search
            placeholder="Search vendors..."
            allowClear
            style={{ width: 300 }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={vendors}
          rowKey="id"
          loading={loading}
          pagination={false}
          onRow={(record) => ({
            onClick: () => router.push(`/vendors/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          onChange={(_, __, sorter) => {
            if (!Array.isArray(sorter) && sorter.columnKey && sorter.order) {
              const newSortField = sorter.columnKey as string
              const newSortOrder = sorter.order === 'descend' ? 'desc' : 'asc'
              setSortField(newSortField)
              setSortOrder(newSortOrder)
              setPage(1)
            }
          }}
          scroll={{ x: 1000 }}
        />
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger
            showTotal={(t) => `${t} vendors`}
            onChange={(newPage, newPageSize) => {
              setPage(newPage)
              if (newPageSize !== pageSize) {
                setPageSize(newPageSize)
              }
            }}
          />
        </div>
      </Card>

      {/* Add Vendor Modal */}
      <Modal title="Add New Vendor" open={addModalOpen} onCancel={() => setAddModalOpen(false)} footer={null} width={700}>
        <Form form={form} layout="vertical" onFinish={handleAddVendor}>
          <Title level={5}>Contact Information</Title>
          <Form.Item name="contact_name" label="Contact Name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="John Smith" />
          </Form.Item>

          <Form.Item name="business_name" label="Business Name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="Smith Plumbing LLC" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Required' },
              { type: 'email', message: 'Invalid email' }
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

          <Form.Item name="location" label="Business Location">
            <Input placeholder="Philadelphia, PA" />
          </Form.Item>

          <Divider />
          <Title level={5}>Services</Title>

          <Form.Item name="services" label="Services Offered" rules={[{ required: true, message: 'Select at least one service' }]}>
            <Select
              mode="multiple"
              placeholder="Select services"
              showSearch
              filterOption={(input, option) => {
                const children = option?.children
                if (children && typeof children === 'string') {
                  return (children as string).toLowerCase().includes(input.toLowerCase())
                }
                return false
              }}
            >
              {groupedCategories.map((group) => (
                <Select.OptGroup key={group.group} label={group.label}>
                  {group.categories.map((cat) => (
                    <Select.Option key={cat.value} value={cat.value}>
                      {cat.label}
                    </Select.Option>
                  ))}
                </Select.OptGroup>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="service_areas" label="Service Areas" rules={[{ required: true, message: 'Add at least one service area' }]}>
            <ServiceAreaAutocomplete placeholder="Search for neighborhoods, cities, or enter zip codes..." />
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
  )
}

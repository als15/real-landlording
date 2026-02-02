'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Table, Card, Tag, Space, Button, Select, Input, Typography, Drawer, Descriptions, Divider, App, Badge, Modal, Form, Checkbox, Rate, Slider, InputNumber, Tooltip, Spin, Pagination } from 'antd'
import { ReloadOutlined, PlusOutlined, EditOutlined, EyeOutlined, FilterOutlined, InfoCircleOutlined, DownloadOutlined, SendOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, DeleteOutlined } from '@ant-design/icons'
import { Vendor, VendorStatus, SlaStatus, VENDOR_STATUS_LABELS, SLA_STATUS_LABELS, SERVICE_TYPE_LABELS, SERVICE_TAXONOMY, ServiceCategory, getGroupedServiceCategories, RequestVendorMatch, ServiceRequest, REQUEST_STATUS_LABELS, RequestStatus, URGENCY_LABELS, UrgencyLevel, MatchStatus } from '@/types/database'
import type { ColumnsType } from 'antd/es/table'
import ServiceAreaAutocomplete from '@/components/ServiceAreaAutocomplete'
import ServiceAreaDisplay from '@/components/ServiceAreaDisplay'
import {
  objectsToCsv,
  downloadCsv,
  formatDateTimeForCsv,
  formatArrayForCsv,
  formatBooleanForCsv,
} from '@/lib/utils/csv-export'

const { Title, Text } = Typography
const { Search, TextArea } = Input

const statusColors: Record<VendorStatus, string> = {
  active: 'green',
  inactive: 'default',
  pending_review: 'orange',
  rejected: 'red'
}

const slaStatusColors: Record<SlaStatus, string> = {
  not_sent: 'default',
  sent: 'processing',
  delivered: 'processing',
  viewed: 'warning',
  signed: 'success',
  declined: 'error',
  voided: 'default'
}

const matchStatusColors: Record<MatchStatus, string> = {
  pending: 'default',
  intro_sent: 'processing',
  vendor_accepted: 'success',
  vendor_declined: 'error',
  no_response: 'warning',
  in_progress: 'processing',
  completed: 'success',
  cancelled: 'default',
  no_show: 'error'
}

const matchStatusLabels: Record<MatchStatus, string> = {
  pending: 'Pending',
  intro_sent: 'Intro Sent',
  vendor_accepted: 'Accepted',
  vendor_declined: 'Declined',
  no_response: 'No Response',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show'
}

// Extended vendor type with matches
interface VendorWithMatches extends Vendor {
  matches?: (RequestVendorMatch & { request: ServiceRequest })[];
}

export default function VendorsPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Spin size="large" /></div>}>
      <VendorsPageContent />
    </Suspense>
  )
}

function VendorsPageContent() {
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
  const [selectedVendor, setSelectedVendor] = useState<VendorWithMatches | null>(null)
  const [loadingVendorDetails, setLoadingVendorDetails] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()
  const [editForm] = Form.useForm()
  const [editSelectedServices, setEditSelectedServices] = useState<ServiceCategory[]>([])
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const { message, notification } = App.useApp()

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

  const editServiceClassifications = getServiceClassifications(editSelectedServices);
  const searchParams = useSearchParams()
  const router = useRouter()
  const viewVendorId = searchParams.get('view')

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1) // Reset to first page on search
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
      notification.error({
        title: 'Failed to fetch vendors',
        description: 'Please try refreshing the page.',
        duration: 8,
      })
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter, debouncedSearch, sortField, sortOrder])

  useEffect(() => {
    fetchVendors()
  }, [fetchVendors])

  // Handle view query parameter to open vendor drawer directly
  useEffect(() => {
    if (viewVendorId) {
      const fetchAndOpenVendor = async () => {
        try {
          const response = await fetch(`/api/vendors/${viewVendorId}`)
          if (response.ok) {
            const vendor = await response.json()
            setSelectedVendor(vendor)
            setDrawerOpen(true)
          } else {
            notification.error({
              title: 'Vendor not found',
              description: 'The vendor you are looking for does not exist.',
              duration: 8,
            })
          }
        } catch (error) {
          console.error('Error fetching vendor:', error)
          notification.error({
            title: 'Failed to load vendor',
            description: 'Please try again.',
            duration: 8,
          })
        }
      }
      fetchAndOpenVendor()
    }
  }, [viewVendorId, message])

  const handleViewVendor = async (vendor: Vendor) => {
    setSelectedVendor(vendor) // Show drawer immediately with basic data
    setDrawerOpen(true)
    setLoadingVendorDetails(true)

    try {
      const response = await fetch(`/api/vendors/${vendor.id}`)
      if (response.ok) {
        const vendorWithMatches = await response.json()
        setSelectedVendor(vendorWithMatches)
      }
    } catch (error) {
      console.error('Error fetching vendor details:', error)
    } finally {
      setLoadingVendorDetails(false)
    }
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    // Clear the view param from URL if present
    if (viewVendorId) {
      router.replace('/vendors')
    }
  }

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
        { key: 'created_at', header: 'Created', formatter: (v) => formatDateTimeForCsv(v as string) },
      ])

      downloadCsv(csv, `vendors-${new Date().toISOString().split('T')[0]}`)
      message.success('Export complete')
    } catch (error) {
      console.error('Export error:', error)
      notification.error({
        title: 'Export Failed',
        description: 'Failed to export vendor data. Please try again.',
        duration: 8,
      })
    }
  }

  const handleStatusChange = async (vendorId: string, newStatus: VendorStatus) => {
    try {
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        message.success('Status updated')
        // Update vendor in place instead of refetching to avoid position change
        setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, status: newStatus } : v))
        if (selectedVendor?.id === vendorId) {
          setSelectedVendor({ ...selectedVendor, status: newStatus })
        }
        if (editingVendor?.id === vendorId) {
          setEditingVendor({ ...editingVendor, status: newStatus })
        }
      } else {
        throw new Error('Failed to update status')
      }
    } catch {
      notification.error({
        title: 'Status Update Failed',
        description: 'Failed to update vendor status. Please try again.',
        duration: 8,
      })
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
      notification.error({
        title: 'Failed to Add Vendor',
        description: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        duration: 0, // Won't auto-close, user must dismiss
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenEditModal = (vendor: Vendor) => {
    setEditingVendor(vendor)
    setEditSelectedServices(vendor.services || [])

    // Build service_specialties form fields from existing data
    // Data is stored as { hvac: ["Gas Furnace", "No Heat"] }
    // We need to reconstruct to { hvac: { "Equipment Type": ["Gas Furnace"], "Service Needed": ["No Heat"] } }
    const serviceSpecialtiesForm: Record<string, Record<string, string[]>> = {};
    if (vendor.service_specialties) {
      for (const [service, specialties] of Object.entries(vendor.service_specialties)) {
        const config = SERVICE_TAXONOMY[service as ServiceCategory];
        if (config && config.classifications.length > 0) {
          serviceSpecialtiesForm[service] = {};
          // For simplicity, put all specialties in the first classification
          const firstClassification = config.classifications[0];
          serviceSpecialtiesForm[service][firstClassification.label] = specialties as string[];
        }
      }
    }

    editForm.setFieldsValue({
      status: vendor.status,
      contact_name: vendor.contact_name,
      business_name: vendor.business_name,
      email: vendor.email,
      phone: vendor.phone,
      website: vendor.website,
      location: vendor.location,
      services: vendor.services,
      service_specialties: serviceSpecialtiesForm,
      service_areas: vendor.service_areas,
      licensed: vendor.licensed,
      insured: vendor.insured,
      rental_experience: vendor.rental_experience,
      qualifications: vendor.qualifications,
      years_in_business: vendor.years_in_business,
      vetting_admin_adjustment: vendor.vetting_admin_adjustment || 0,
      admin_notes: vendor.admin_notes,
    })
    setEditModalOpen(true)
  }

  const handleEditVendor = async (values: Record<string, unknown>) => {
    if (!editingVendor) return

    setSubmitting(true)
    try {
      // Transform service_specialties from nested form structure to flat storage format
      let serviceSpecialties: Record<string, string[]> | null = null;
      const formSpecialties = values.service_specialties as Record<string, Record<string, string[]>> | undefined;
      if (formSpecialties && typeof formSpecialties === 'object') {
        serviceSpecialties = {};
        for (const [service, classifications] of Object.entries(formSpecialties)) {
          if (classifications && typeof classifications === 'object') {
            const allOptions: string[] = [];
            for (const options of Object.values(classifications)) {
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

      const updateData = {
        ...values,
        service_specialties: serviceSpecialties,
      };

      const response = await fetch(`/api/vendors/${editingVendor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        const result = await response.json()
        const updatedVendor = result.data || { ...editingVendor, ...values }

        message.success('Vendor updated successfully')
        setEditModalOpen(false)
        setEditingVendor(null)
        editForm.resetFields()

        // Update vendor in place instead of refetching to avoid position change
        setVendors(prev => prev.map(v => v.id === editingVendor.id ? updatedVendor : v))

        // Update drawer if open with same vendor
        if (selectedVendor?.id === editingVendor.id) {
          setSelectedVendor(updatedVendor)
        }
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update vendor')
      }
    } catch (error) {
      notification.error({
        title: 'Failed to Update Vendor',
        description: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        duration: 0, // Won't auto-close, user must dismiss
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusFilterChange = (value: string | null) => {
    setStatusFilter(value)
    setPage(1) // Reset to first page on filter change
  }

  const handleSendSla = async (vendor: Vendor) => {
    try {
      const response = await fetch(`/api/admin/vendors/${vendor.id}/send-sla`, {
        method: 'POST',
      })

      if (response.ok) {
        const result = await response.json()
        message.success('SLA sent successfully')

        // Update vendor in place
        const updatedVendor = { ...vendor, sla_status: 'sent' as SlaStatus, sla_envelope_id: result.envelopeId }
        setVendors(prev => prev.map(v => v.id === vendor.id ? updatedVendor : v))
        if (selectedVendor?.id === vendor.id) {
          setSelectedVendor(updatedVendor)
        }
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to send SLA')
      }
    } catch (error) {
      notification.error({
        title: 'Failed to Send SLA',
        description: error instanceof Error ? error.message : 'Failed to send SLA. Please try again.',
        duration: 8,
      })
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
      notification.error({
        title: 'Failed to Resend SLA',
        description: error instanceof Error ? error.message : 'Failed to resend SLA notification. Please try again.',
        duration: 8,
      })
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
            // Remove from local state
            setVendors(prev => prev.filter(v => v.id !== vendor.id))
            setTotal(prev => prev - 1)
            // Close drawer if viewing deleted vendor
            if (selectedVendor?.id === vendor.id) {
              setDrawerOpen(false)
            }
          } else {
            const error = await response.json()
            throw new Error(error.message || 'Failed to delete vendor')
          }
        } catch (error) {
          notification.error({
            title: 'Failed to Delete Vendor',
            description: error instanceof Error ? error.message : 'Failed to delete vendor. Please try again.',
            duration: 8,
          })
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
              {SERVICE_TYPE_LABELS[s as keyof typeof SERVICE_TYPE_LABELS] || s}
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
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewVendor(record)} title="View" />
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEditModal(record)} title="Edit" />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteVendor(record)} title="Delete" />
        </Space>
      ),
      width: 140
    }
  ]

  const groupedCategories = getGroupedServiceCategories()

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
          onChange={(_, __, sorter) => {
            // Handle sorting only - resets to page 1
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
              console.log('[Pagination] onChange:', { newPage, newPageSize })
              setPage(newPage)
              if (newPageSize !== pageSize) {
                setPageSize(newPageSize)
              }
            }}
          />
        </div>
      </Card>

      {/* Vendor Details Drawer */}
      <Drawer
        title="Vendor Details"
        placement="right"
        size="large"
        onClose={handleCloseDrawer}
        open={drawerOpen}
        extra={
          selectedVendor && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                setDrawerOpen(false)
                handleOpenEditModal(selectedVendor)
              }}
            >
              Edit
            </Button>
          )
        }
      >
        {selectedVendor && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Status">
                <Select
                  value={selectedVendor.status}
                  style={{ width: 150 }}
                  onChange={value => handleStatusChange(selectedVendor.id, value)}
                  options={Object.entries(VENDOR_STATUS_LABELS).map(([v, l]) => ({
                    value: v,
                    label: l
                  }))}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Business Name">{selectedVendor.business_name}</Descriptions.Item>
              <Descriptions.Item label="Contact Name">{selectedVendor.contact_name}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedVendor.email}</Descriptions.Item>
              <Descriptions.Item label="Phone">{selectedVendor.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="Website">
                {selectedVendor.website ? (
                  <a href={selectedVendor.website} target="_blank" rel="noopener noreferrer">
                    {selectedVendor.website}
                  </a>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Location">{selectedVendor.location || '-'}</Descriptions.Item>
            </Descriptions>

            <Divider>Services</Divider>

            <Space wrap>
              {selectedVendor.services.map(s => (
                <Tag key={s} color="blue">
                  {SERVICE_TYPE_LABELS[s as keyof typeof SERVICE_TYPE_LABELS] || s}
                </Tag>
              ))}
            </Space>

            {/* Service Specialties */}
            {selectedVendor.service_specialties && Object.keys(selectedVendor.service_specialties).length > 0 && (
              <>
                <Divider>Service Specialties</Divider>
                {Object.entries(selectedVendor.service_specialties).map(([service, specialties]) => (
                  <div key={service} style={{ marginBottom: 8 }}>
                    <Text strong style={{ display: 'block', marginBottom: 4 }}>
                      {SERVICE_TYPE_LABELS[service as keyof typeof SERVICE_TYPE_LABELS] || service}:
                    </Text>
                    <Space wrap size="small">
                      {(specialties as string[]).map((specialty: string) => (
                        <Tag key={specialty}>{specialty}</Tag>
                      ))}
                    </Space>
                  </div>
                ))}
              </>
            )}

            <Divider>Service Areas</Divider>

            <ServiceAreaDisplay serviceAreas={selectedVendor.service_areas} />

            <Divider>Qualifications</Divider>

            <Descriptions column={2} size="small">
              <Descriptions.Item label="Licensed">{selectedVendor.licensed ? 'Yes' : 'No'}</Descriptions.Item>
              <Descriptions.Item label="Insured">{selectedVendor.insured ? 'Yes' : 'No'}</Descriptions.Item>
              <Descriptions.Item label="Rental Experience">{selectedVendor.rental_experience ? 'Yes' : 'No'}</Descriptions.Item>
            </Descriptions>

            {selectedVendor.qualifications && (
              <>
                <Divider>Qualifications Details</Divider>
                <Text>{selectedVendor.qualifications}</Text>
              </>
            )}

            <Divider>Vetting Score</Divider>

            <Descriptions column={2} size="small">
              <Descriptions.Item label="Years in Business">
                {selectedVendor.years_in_business != null ? `${selectedVendor.years_in_business}+ years` : 'Not set'}
              </Descriptions.Item>
              <Descriptions.Item label="Base Score">{selectedVendor.vetting_score ?? 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Admin Adjustment">
                <Text style={{ color: (selectedVendor.vetting_admin_adjustment || 0) > 0 ? 'green' : (selectedVendor.vetting_admin_adjustment || 0) < 0 ? 'red' : undefined }}>
                  {(selectedVendor.vetting_admin_adjustment || 0) > 0 ? '+' : ''}{selectedVendor.vetting_admin_adjustment || 0}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Total Vetting">
                <Text strong>
                  {selectedVendor.vetting_score != null
                    ? Math.min(45, Math.max(0, selectedVendor.vetting_score + (selectedVendor.vetting_admin_adjustment || 0)))
                    : 'N/A'}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider>Performance</Divider>

            <Space>
              <Rate disabled defaultValue={selectedVendor.performance_score} allowHalf />
              <Text>({selectedVendor.total_reviews} reviews)</Text>
            </Space>

            <Divider>SLA Agreement</Divider>

            <Descriptions column={2} size="small">
              <Descriptions.Item label="Status">
                {(() => {
                  const status = selectedVendor.sla_status || 'not_sent'
                  if (status === 'signed') {
                    return <Tag icon={<CheckCircleOutlined />} color="success">Signed</Tag>
                  }
                  if (status === 'declined') {
                    return <Tag icon={<CloseCircleOutlined />} color="error">Declined</Tag>
                  }
                  if (['sent', 'delivered', 'viewed'].includes(status)) {
                    return <Tag icon={<ClockCircleOutlined />} color="processing">{SLA_STATUS_LABELS[status as SlaStatus]}</Tag>
                  }
                  return <Tag color="default">{SLA_STATUS_LABELS[status as SlaStatus]}</Tag>
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Sent At">
                {selectedVendor.sla_sent_at
                  ? new Date(selectedVendor.sla_sent_at).toLocaleDateString()
                  : '-'}
              </Descriptions.Item>
              {selectedVendor.sla_signed_at && (
                <Descriptions.Item label="Signed At">
                  {new Date(selectedVendor.sla_signed_at).toLocaleDateString()}
                </Descriptions.Item>
              )}
            </Descriptions>

            {(!selectedVendor.sla_status || selectedVendor.sla_status === 'not_sent') && selectedVendor.status === 'active' && (
              <div style={{ marginTop: 16 }}>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={() => handleSendSla(selectedVendor)}
                >
                  Send SLA for Signature
                </Button>
              </div>
            )}

            {selectedVendor.sla_status && ['sent', 'delivered', 'viewed'].includes(selectedVendor.sla_status) && (
              <div style={{ marginTop: 16 }}>
                <Button
                  icon={<SendOutlined />}
                  onClick={() => handleResendSla(selectedVendor)}
                >
                  Resend SLA Notification
                </Button>
              </div>
            )}

            {selectedVendor.sla_document_url && (
              <div style={{ marginTop: 16 }}>
                <Button
                  icon={<DownloadOutlined />}
                  href={selectedVendor.sla_document_url}
                  target="_blank"
                >
                  Download Signed SLA
                </Button>
              </div>
            )}

            {selectedVendor.admin_notes && (
              <>
                <Divider>Admin Notes</Divider>
                <Text>{selectedVendor.admin_notes}</Text>
              </>
            )}

            <Divider>Referral History</Divider>

            {loadingVendorDetails ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Spin />
              </div>
            ) : selectedVendor.matches && selectedVendor.matches.length > 0 ? (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {selectedVendor.matches
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((match) => (
                    <Card
                      key={match.id}
                      size="small"
                      style={{ marginBottom: 8 }}
                      title={
                        <Space>
                          <Tag color="blue">
                            {SERVICE_TYPE_LABELS[match.request?.service_type as keyof typeof SERVICE_TYPE_LABELS] || match.request?.service_type}
                          </Tag>
                          <Tag color={matchStatusColors[match.status]}>
                            {matchStatusLabels[match.status]}
                          </Tag>
                        </Space>
                      }
                      extra={
                        match.review_rating && (
                          <Rate disabled defaultValue={match.review_rating} style={{ fontSize: 12 }} />
                        )
                      }
                    >
                      <Descriptions size="small" column={1}>
                        <Descriptions.Item label="Location">
                          {match.request?.property_address || match.request?.property_location || '-'}
                          {match.request?.zip_code && ` (${match.request.zip_code})`}
                        </Descriptions.Item>
                        <Descriptions.Item label="Landlord">
                          {match.request?.first_name || match.request?.landlord_name || match.request?.landlord_email || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Date">
                          {new Date(match.created_at).toLocaleDateString()}
                        </Descriptions.Item>
                        {match.request?.urgency && (
                          <Descriptions.Item label="Urgency">
                            <Tag color={match.request.urgency === 'emergency' ? 'red' : match.request.urgency === 'high' ? 'orange' : 'default'}>
                              {URGENCY_LABELS[match.request.urgency as UrgencyLevel]}
                            </Tag>
                          </Descriptions.Item>
                        )}
                        {match.request?.status && (
                          <Descriptions.Item label="Request Status">
                            <Tag>{REQUEST_STATUS_LABELS[match.request.status as RequestStatus]}</Tag>
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                      {match.request?.job_description && (
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                          {match.request.job_description.length > 100
                            ? `${match.request.job_description.substring(0, 100)}...`
                            : match.request.job_description}
                        </Text>
                      )}
                    </Card>
                  ))}
              </div>
            ) : (
              <Text type="secondary">No referrals yet</Text>
            )}
          </>
        )}
      </Drawer>

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

      {/* Edit Vendor Modal */}
      <Modal
        title={`Edit Vendor: ${editingVendor?.business_name || ''}`}
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false)
          setEditingVendor(null)
          editForm.resetFields()
        }}
        footer={null}
        width={700}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditVendor}>
          <Form.Item name="status" label="Status">
            <Select
              options={Object.entries(VENDOR_STATUS_LABELS).map(([v, l]) => ({
                value: v,
                label: l
              }))}
            />
          </Form.Item>

          <Divider />
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
              onChange={(values: ServiceCategory[]) => setEditSelectedServices(values)}
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

          {/* Service Specialties (Editable) */}
          {editServiceClassifications.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Service Specialties</Text>
              {editServiceClassifications.map(({ service, label, classifications }) => (
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

          <Form.Item name="years_in_business" label="Years in Business">
            <Select
              placeholder="Select years of experience"
              allowClear
              options={[
                { value: 0, label: 'Less than 1 year' },
                { value: 1, label: '1 year' },
                { value: 2, label: '2 years' },
                { value: 3, label: '3 years' },
                { value: 4, label: '4 years' },
                { value: 5, label: '5+ years' },
                { value: 10, label: '10+ years' },
                { value: 20, label: '20+ years' },
              ]}
            />
          </Form.Item>

          <Form.Item name="qualifications" label="Additional Qualifications">
            <TextArea rows={3} placeholder="Certifications, years of experience, etc." />
          </Form.Item>

          <Divider />
          <Title level={5}>
            Vetting Score{' '}
            <Tooltip title="Auto-calculated based on license, insurance, and years in business. Admin adjustment allows ±10 points.">
              <InfoCircleOutlined style={{ fontSize: 14, color: '#999' }} />
            </Tooltip>
          </Title>

          {editingVendor && (
            <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Base Vetting Score:</Text>
                  <Text strong>{editingVendor.vetting_score ?? 'Not calculated'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Admin Adjustment:</Text>
                  <Text strong style={{ color: (editingVendor.vetting_admin_adjustment || 0) > 0 ? 'green' : (editingVendor.vetting_admin_adjustment || 0) < 0 ? 'red' : undefined }}>
                    {(editingVendor.vetting_admin_adjustment || 0) > 0 ? '+' : ''}{editingVendor.vetting_admin_adjustment || 0}
                  </Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text strong>Total Vetting Score:</Text>
                  <Text strong style={{ fontSize: 16 }}>
                    {editingVendor.vetting_score != null
                      ? Math.min(45, Math.max(0, editingVendor.vetting_score + (editingVendor.vetting_admin_adjustment || 0)))
                      : 'N/A'}
                  </Text>
                </div>
              </Space>
            </div>
          )}

          <Form.Item
            name="vetting_admin_adjustment"
            label="Admin Vetting Adjustment"
            extra="Adjust vetting score by -10 to +10 points based on your assessment"
          >
            <Slider
              min={-10}
              max={10}
              marks={{
                '-10': '-10',
                '-5': '-5',
                0: '0',
                5: '+5',
                10: '+10',
              }}
            />
          </Form.Item>

          <Divider />
          <Title level={5}>Admin</Title>

          <Form.Item name="admin_notes" label="Admin Notes">
            <TextArea rows={3} placeholder="Internal notes about this vendor..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Save Changes
              </Button>
              <Button onClick={() => {
                setEditModalOpen(false)
                setEditingVendor(null)
                editForm.resetFields()
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

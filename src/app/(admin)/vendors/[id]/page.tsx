'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Tabs, Tag, Space, Typography, Spin, Modal } from 'antd'
import { ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNotify } from '@/hooks/useNotify'
import { VendorWithMatches, SlaStatus, VENDOR_STATUS_LABELS, VendorStatus } from '@/types/database'
import {
  VendorOverviewTab,
  VendorServicesTab,
  VendorReferralTermsTab,
  VendorSlaComplianceTab,
  VendorHistoryTab,
  statusColors,
} from '@/components/admin/vendors'

const { Title } = Typography

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { message } = useNotify()
  const [vendor, setVendor] = useState<VendorWithMatches | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchVendor = useCallback(async () => {
    try {
      const response = await fetch(`/api/vendors/${id}`)
      if (response.ok) {
        const data = await response.json()
        setVendor(data)
      } else {
        message.error('Vendor not found')
        router.push('/vendors')
      }
    } catch {
      message.error('Failed to load vendor')
      router.push('/vendors')
    } finally {
      setLoading(false)
    }
  }, [id, message, router])

  useEffect(() => {
    fetchVendor()
  }, [fetchVendor])

  const handleUpdate = async (updates: Record<string, unknown>) => {
    if (!vendor) return
    setSaving(true)
    try {
      const response = await fetch(`/api/vendors/${vendor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const result = await response.json()
        const updatedVendor = result.data || { ...vendor, ...updates }
        // Preserve matches from current state since PATCH response may not include them
        setVendor({ ...updatedVendor, matches: vendor.matches })
        message.success('Vendor updated')
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update vendor')
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to update vendor')
    } finally {
      setSaving(false)
    }
  }

  const handleSendSla = async () => {
    if (!vendor) return
    try {
      const response = await fetch(`/api/admin/vendors/${vendor.id}/send-sla`, {
        method: 'POST',
      })
      if (response.ok) {
        const result = await response.json()
        message.success('SLA sent successfully')
        setVendor({ ...vendor, sla_status: 'sent' as SlaStatus, sla_envelope_id: result.envelopeId })
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to send SLA')
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to send SLA')
    }
  }

  const handleResendSla = async () => {
    if (!vendor) return
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
      message.error(error instanceof Error ? error.message : 'Failed to resend SLA')
    }
  }

  const handleDelete = () => {
    if (!vendor) return
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
            message.success('Vendor deleted')
            router.push('/vendors')
          } else {
            const error = await response.json()
            throw new Error(error.message || 'Failed to delete vendor')
          }
        } catch (error) {
          message.error(error instanceof Error ? error.message : 'Failed to delete vendor')
        }
      },
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!vendor) return null

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: <VendorOverviewTab vendor={vendor} onUpdate={handleUpdate} saving={saving} />,
    },
    {
      key: 'services',
      label: 'Services',
      children: <VendorServicesTab vendor={vendor} onUpdate={handleUpdate} saving={saving} />,
    },
    {
      key: 'referral-terms',
      label: 'Referral Terms',
      children: <VendorReferralTermsTab vendor={vendor} onUpdate={handleUpdate} saving={saving} />,
    },
    {
      key: 'sla',
      label: 'SLA & Compliance',
      children: (
        <VendorSlaComplianceTab
          vendor={vendor}
          onUpdate={handleUpdate}
          onSendSla={handleSendSla}
          onResendSla={handleResendSla}
          saving={saving}
        />
      ),
    },
    {
      key: 'history',
      label: 'History',
      children: <VendorHistoryTab vendor={vendor} loading={false} />,
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/vendors')}>
            Back
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            {vendor.business_name}
          </Title>
          <Tag color={statusColors[vendor.status as VendorStatus]}>
            {VENDOR_STATUS_LABELS[vendor.status]}
          </Tag>
        </Space>
        <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
          Delete
        </Button>
      </div>

      <Tabs defaultActiveKey="overview" items={tabItems} />
    </div>
  )
}

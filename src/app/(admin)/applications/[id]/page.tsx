'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Tabs, Tag, Space, Typography, Spin, Modal } from 'antd'
import { ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNotify } from '@/hooks/useNotify'
import { Vendor } from '@/types/database'
import {
  ApplicationOverviewTab,
  ApplicationServicesTab,
  ApplicationQualificationsTab,
  ApplicationDueDiligenceTab,
  ApplicationReviewTab,
} from '@/components/admin/applications'

const { Title } = Typography

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { message } = useNotify()
  const [application, setApplication] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)

  const fetchApplication = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/applications/${id}`)
      if (response.ok) {
        const data = await response.json()
        setApplication(data)
      } else {
        message.error('Application not found')
        router.push('/applications')
      }
    } catch {
      message.error('Failed to load application')
      router.push('/applications')
    } finally {
      setLoading(false)
    }
  }, [id, message, router])

  useEffect(() => {
    fetchApplication()
  }, [fetchApplication])

  const handleUpdate = async (updates: Record<string, unknown>) => {
    if (!application) return
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/applications/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const result = await response.json()
        setApplication(result.data || { ...application, ...updates })
        message.success('Application updated')
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update application')
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to update application')
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async () => {
    if (!application) return
    setProcessing(true)
    try {
      const response = await fetch(`/api/admin/applications/${application.id}/approve`, {
        method: 'POST',
      })

      if (response.ok) {
        message.success('Vendor approved successfully!')
        router.push('/applications')
      } else {
        throw new Error('Failed to approve vendor')
      }
    } catch {
      message.error('Failed to approve vendor')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (reason: string) => {
    if (!application) return
    setProcessing(true)
    try {
      const response = await fetch(`/api/admin/applications/${application.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (response.ok) {
        message.success('Application rejected')
        router.push('/applications')
      } else {
        throw new Error('Failed to reject application')
      }
    } catch {
      message.error('Failed to reject application')
    } finally {
      setProcessing(false)
    }
  }

  const handleScheduleInterview = async () => {
    if (!application) return
    try {
      const response = await fetch(`/api/admin/applications/${application.id}/schedule-interview`, {
        method: 'POST',
      })

      if (response.ok) {
        const result = await response.json()
        setApplication({
          ...application,
          interview_scheduled_at: result.interview_scheduled_at,
          interview_scheduled_count: result.interview_scheduled_count,
        })
        message.success('Interview link sent to vendor')
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to send interview link')
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to send interview link')
    }
  }

  const handleDelete = () => {
    if (!application) return
    Modal.confirm({
      title: 'Delete Application',
      content: `Are you sure you want to delete the application from "${application.business_name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const response = await fetch(`/api/admin/applications/${application.id}`, {
            method: 'DELETE',
          })
          if (response.ok) {
            message.success('Application deleted')
            router.push('/applications')
          } else {
            const error = await response.json()
            throw new Error(error.message || 'Failed to delete application')
          }
        } catch (error) {
          message.error(error instanceof Error ? error.message : 'Failed to delete application')
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

  if (!application) return null

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: <ApplicationOverviewTab application={application} onUpdate={handleUpdate} saving={saving} />,
    },
    {
      key: 'services',
      label: 'Services',
      children: <ApplicationServicesTab application={application} onUpdate={handleUpdate} saving={saving} />,
    },
    {
      key: 'qualifications',
      label: 'Qualifications',
      children: <ApplicationQualificationsTab application={application} onUpdate={handleUpdate} saving={saving} />,
    },
    {
      key: 'due-diligence',
      label: 'Due Diligence',
      children: <ApplicationDueDiligenceTab applicationId={id} />,
    },
    {
      key: 'review',
      label: 'Review',
      children: (
        <ApplicationReviewTab
          application={application}
          onUpdate={handleUpdate}
          onApprove={handleApprove}
          onReject={handleReject}
          onScheduleInterview={handleScheduleInterview}
          onDelete={handleDelete}
          saving={saving}
          processing={processing}
        />
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/applications')}>
            Back
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            {application.business_name}
          </Title>
          <Tag color="orange">Pending Review</Tag>
        </Space>
        <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
          Delete
        </Button>
      </div>

      <Tabs defaultActiveKey="overview" items={tabItems} />
    </div>
  )
}

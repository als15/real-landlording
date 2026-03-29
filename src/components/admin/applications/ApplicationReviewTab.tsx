'use client'

import { useState } from 'react'
import { Button, Form, Input, Space, Typography, Divider, Modal, Alert } from 'antd'
import { CalendarOutlined, CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { Vendor } from '@/types/database'

const { Text } = Typography
const { TextArea } = Input

interface ApplicationReviewTabProps {
  application: Vendor
  onUpdate: (updates: Record<string, unknown>) => Promise<void>
  onApprove: () => Promise<void>
  onReject: (reason: string) => Promise<void>
  onScheduleInterview: () => Promise<void>
  onDelete: () => void
  saving: boolean
  processing: boolean
}

export default function ApplicationReviewTab({
  application,
  onUpdate,
  onApprove,
  onReject,
  onScheduleInterview,
  onDelete,
  saving,
  processing,
}: ApplicationReviewTabProps) {
  const [editingNotes, setEditingNotes] = useState(false)
  const [form] = Form.useForm()
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [schedulingInterview, setSchedulingInterview] = useState(false)

  const handleStartEditNotes = () => {
    form.setFieldsValue({
      admin_notes: application.admin_notes || '',
    })
    setEditingNotes(true)
  }

  const handleSaveNotes = async () => {
    try {
      const values = await form.validateFields()
      await onUpdate({ admin_notes: values.admin_notes || null })
      setEditingNotes(false)
    } catch {
      // validation error
    }
  }

  const handleReject = async () => {
    await onReject(rejectReason)
    setRejectModalOpen(false)
    setRejectReason('')
  }

  const handleScheduleInterview = async () => {
    setSchedulingInterview(true)
    try {
      await onScheduleInterview()
    } finally {
      setSchedulingInterview(false)
    }
  }

  const hasBeenScheduled = !!application.interview_scheduled_at

  return (
    <>
      <Divider>Admin Notes</Divider>

      {editingNotes ? (
        <Form form={form} layout="vertical">
          <Form.Item name="admin_notes">
            <TextArea rows={4} placeholder="Add internal notes about this application..." />
          </Form.Item>
          <Space>
            <Button onClick={() => setEditingNotes(false)}>Cancel</Button>
            <Button type="primary" onClick={handleSaveNotes} loading={saving}>Save</Button>
          </Space>
        </Form>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text>{application.admin_notes || <Text type="secondary">No admin notes</Text>}</Text>
          <Button icon={<EditOutlined />} size="small" onClick={handleStartEditNotes}>Edit</Button>
        </div>
      )}

      <Divider>Interview</Divider>

      {hasBeenScheduled ? (
        <div>
          <Alert
            type="success"
            showIcon
            message={`Interview link sent ${application.interview_scheduled_count} time${application.interview_scheduled_count !== 1 ? 's' : ''}`}
            description={`Last sent: ${new Date(application.interview_scheduled_at!).toLocaleString()}`}
            style={{ marginBottom: 16 }}
          />
          <Button
            icon={<CalendarOutlined />}
            onClick={handleScheduleInterview}
            loading={schedulingInterview}
          >
            Resend Interview Link
          </Button>
        </div>
      ) : (
        <Button
          type="primary"
          size="large"
          icon={<CalendarOutlined />}
          onClick={handleScheduleInterview}
          loading={schedulingInterview}
        >
          Schedule Interview
        </Button>
      )}

      <Divider>Actions</Divider>

      <Space size="large">
        <Button
          type="primary"
          size="large"
          icon={<CheckOutlined />}
          loading={processing}
          onClick={onApprove}
        >
          Approve Application
        </Button>
        <Button
          danger
          size="large"
          icon={<CloseOutlined />}
          onClick={() => setRejectModalOpen(true)}
        >
          Reject Application
        </Button>
        <Button
          danger
          type="dashed"
          size="large"
          icon={<DeleteOutlined />}
          onClick={onDelete}
        >
          Delete Application
        </Button>
      </Space>

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
    </>
  )
}

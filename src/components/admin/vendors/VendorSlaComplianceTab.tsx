'use client'

import { useState } from 'react'
import { Descriptions, Tag, Button, Form, Input, Space, Typography, Divider } from 'antd'
import { EditOutlined, SendOutlined, DownloadOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { Vendor, SlaStatus, SLA_STATUS_LABELS } from '@/types/database'

const { Text } = Typography
const { TextArea } = Input

interface VendorSlaComplianceTabProps {
  vendor: Vendor
  onUpdate: (updates: Record<string, unknown>) => Promise<void>
  onSendSla: () => Promise<void>
  onResendSla: () => Promise<void>
  saving: boolean
}

export default function VendorSlaComplianceTab({ vendor, onUpdate, onSendSla, onResendSla, saving }: VendorSlaComplianceTabProps) {
  const [editing, setEditing] = useState(false)
  const [form] = Form.useForm()

  const slaStatus = vendor.sla_status || 'not_sent'

  const handleStartEdit = () => {
    form.setFieldsValue({
      admin_notes: vendor.admin_notes,
    })
    setEditing(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      await onUpdate({ admin_notes: values.admin_notes })
      setEditing(false)
    } catch {
      // validation error
    }
  }

  const renderSlaStatusTag = () => {
    if (slaStatus === 'signed') {
      return <Tag icon={<CheckCircleOutlined />} color="success">Signed</Tag>
    }
    if (slaStatus === 'declined') {
      return <Tag icon={<CloseCircleOutlined />} color="error">Declined</Tag>
    }
    if (['sent', 'delivered', 'viewed'].includes(slaStatus)) {
      return <Tag icon={<ClockCircleOutlined />} color="processing">{SLA_STATUS_LABELS[slaStatus as SlaStatus]}</Tag>
    }
    return <Tag color="default">{SLA_STATUS_LABELS[slaStatus as SlaStatus]}</Tag>
  }

  return (
    <>
      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label="SLA Status">{renderSlaStatusTag()}</Descriptions.Item>
        <Descriptions.Item label="Sent At">
          {vendor.sla_sent_at ? new Date(vendor.sla_sent_at).toLocaleDateString() : '-'}
        </Descriptions.Item>
        {vendor.sla_signed_at && (
          <Descriptions.Item label="Signed At">
            {new Date(vendor.sla_signed_at).toLocaleDateString()}
          </Descriptions.Item>
        )}
      </Descriptions>

      <Space style={{ marginTop: 16 }} wrap>
        {(!vendor.sla_status || vendor.sla_status === 'not_sent') && vendor.status === 'active' && (
          <Button type="primary" icon={<SendOutlined />} onClick={onSendSla}>
            Send SLA for Signature
          </Button>
        )}
        {vendor.sla_status && ['sent', 'delivered', 'viewed'].includes(vendor.sla_status) && (
          <Button icon={<SendOutlined />} onClick={onResendSla}>
            Resend SLA Notification
          </Button>
        )}
        {vendor.sla_document_url && (
          <Button
            icon={<DownloadOutlined />}
            href={vendor.sla_document_url}
            target="_blank"
          >
            Download Signed SLA
          </Button>
        )}
      </Space>

      <Divider>Admin Notes</Divider>

      {editing ? (
        <Form form={form} layout="vertical">
          <Form.Item name="admin_notes">
            <TextArea rows={4} placeholder="Internal notes about this vendor..." />
          </Form.Item>
          <Space>
            <Button onClick={() => setEditing(false)}>Cancel</Button>
            <Button type="primary" onClick={handleSave} loading={saving}>Save</Button>
          </Space>
        </Form>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text>{vendor.admin_notes || <Text type="secondary">No admin notes</Text>}</Text>
            <Button icon={<EditOutlined />} size="small" onClick={handleStartEdit}>Edit</Button>
          </div>
        </>
      )}
    </>
  )
}

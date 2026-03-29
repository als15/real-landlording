'use client'

import { useState } from 'react'
import { Descriptions, Button, Form, Input, Space, Typography, Divider } from 'antd'
import { EditOutlined, InstagramOutlined, FacebookOutlined, LinkedinOutlined } from '@ant-design/icons'
import { Vendor, REFERRAL_SOURCE_OPTIONS } from '@/types/database'
import { Select } from 'antd'

const { Text } = Typography

interface ApplicationOverviewTabProps {
  application: Vendor
  onUpdate: (updates: Record<string, unknown>) => Promise<void>
  saving: boolean
}

export default function ApplicationOverviewTab({ application, onUpdate, saving }: ApplicationOverviewTabProps) {
  const [editing, setEditing] = useState(false)
  const [form] = Form.useForm()

  const handleStartEdit = () => {
    form.setFieldsValue({
      website: application.website || '',
      location: application.location || '',
      social_instagram: application.social_instagram || '',
      social_facebook: application.social_facebook || '',
      social_linkedin: application.social_linkedin || '',
      referral_source: application.referral_source || '',
      referral_source_name: application.referral_source_name || '',
    })
    setEditing(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      await onUpdate({
        website: values.website || null,
        location: values.location || null,
        social_instagram: values.social_instagram || null,
        social_facebook: values.social_facebook || null,
        social_linkedin: values.social_linkedin || null,
        referral_source: values.referral_source || null,
        referral_source_name: values.referral_source_name || null,
      })
      setEditing(false)
    } catch {
      // validation error
    }
  }

  if (editing) {
    return (
      <Form form={form} layout="vertical">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <Space>
            <Button onClick={() => setEditing(false)}>Cancel</Button>
            <Button type="primary" onClick={handleSave} loading={saving}>Save</Button>
          </Space>
        </div>

        <Divider plain>Business Info</Divider>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item label="Website" name="website">
            <Input placeholder="Website URL" />
          </Form.Item>
          <Form.Item label="Location" name="location">
            <Input placeholder="Business location" />
          </Form.Item>
        </div>

        <Divider plain>Social Media</Divider>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <Form.Item name="social_instagram">
            <Input prefix={<InstagramOutlined />} placeholder="Instagram" />
          </Form.Item>
          <Form.Item name="social_facebook">
            <Input prefix={<FacebookOutlined />} placeholder="Facebook" />
          </Form.Item>
          <Form.Item name="social_linkedin">
            <Input prefix={<LinkedinOutlined />} placeholder="LinkedIn" />
          </Form.Item>
        </div>

        <Divider plain>Referral Info</Divider>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item label="How They Found Us" name="referral_source">
            <Select
              placeholder="Select source"
              allowClear
              options={REFERRAL_SOURCE_OPTIONS}
            />
          </Form.Item>
          <Form.Item label="Referrer Name" name="referral_source_name">
            <Input placeholder="Name of person who referred" />
          </Form.Item>
        </div>
      </Form>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button icon={<EditOutlined />} onClick={handleStartEdit}>Edit</Button>
      </div>

      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label="Business Name" span={2}>
          {application.business_name}
        </Descriptions.Item>
        <Descriptions.Item label="Contact Name">
          {application.contact_name}
        </Descriptions.Item>
        <Descriptions.Item label="Phone">
          {application.phone || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Email" span={2}>
          {application.email}
        </Descriptions.Item>
        <Descriptions.Item label="Website" span={2}>
          {application.website ? (
            <a href={application.website} target="_blank" rel="noopener noreferrer">{application.website}</a>
          ) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Location" span={2}>
          {application.location || '-'}
        </Descriptions.Item>
      </Descriptions>

      <Divider>Social Media</Divider>
      <Descriptions column={3} size="small">
        <Descriptions.Item label="Instagram">
          {application.social_instagram || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Facebook">
          {application.social_facebook || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="LinkedIn">
          {application.social_linkedin || '-'}
        </Descriptions.Item>
      </Descriptions>

      <Divider>Referral Info</Divider>
      <Descriptions column={2} size="small">
        <Descriptions.Item label="How They Found Us">
          {application.referral_source
            ? REFERRAL_SOURCE_OPTIONS.find(o => o.value === application.referral_source)?.label || application.referral_source
            : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Referrer Name">
          {application.referral_source_name || '-'}
        </Descriptions.Item>
      </Descriptions>

      {application.interview_scheduled_at && (
        <>
          <Divider>Interview</Divider>
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Interview Link Sent">
              {new Date(application.interview_scheduled_at).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Times Sent">
              {application.interview_scheduled_count}
            </Descriptions.Item>
          </Descriptions>
        </>
      )}

      <Divider>Application Date</Divider>
      <Text>Applied on {new Date(application.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
    </>
  )
}

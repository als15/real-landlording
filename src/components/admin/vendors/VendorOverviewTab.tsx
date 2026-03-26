'use client'

import { useState } from 'react'
import { Descriptions, Tag, Select, Space, Button, Form, Input, Checkbox, Slider, Tooltip, Rate, Typography, Divider } from 'antd'
import { EditOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { Vendor, VendorStatus, VENDOR_STATUS_LABELS } from '@/types/database'
import { statusColors } from './constants'

const { Text } = Typography
const { TextArea } = Input

interface VendorOverviewTabProps {
  vendor: Vendor
  onUpdate: (updates: Record<string, unknown>) => Promise<void>
  saving: boolean
}

export default function VendorOverviewTab({ vendor, onUpdate, saving }: VendorOverviewTabProps) {
  const [editing, setEditing] = useState(false)
  const [form] = Form.useForm()

  const handleStartEdit = () => {
    form.setFieldsValue({
      contact_name: vendor.contact_name,
      business_name: vendor.business_name,
      email: vendor.email,
      phone: vendor.phone,
      website: vendor.website,
      location: vendor.location,
      licensed: vendor.licensed,
      insured: vendor.insured,
      rental_experience: vendor.rental_experience,
      years_in_business: vendor.years_in_business,
      qualifications: vendor.qualifications,
      vetting_admin_adjustment: vendor.vetting_admin_adjustment || 0,
    })
    setEditing(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      await onUpdate(values)
      setEditing(false)
    } catch {
      // validation error
    }
  }

  const handleStatusChange = async (newStatus: VendorStatus) => {
    await onUpdate({ status: newStatus })
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

        <Divider plain>Contact Information</Divider>

        <Form.Item name="contact_name" label="Contact Name" rules={[{ required: true, message: 'Required' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="business_name" label="Business Name" rules={[{ required: true, message: 'Required' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Required' }, { type: 'email', message: 'Invalid email' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="phone" label="Phone">
          <Input />
        </Form.Item>
        <Form.Item name="website" label="Website">
          <Input />
        </Form.Item>
        <Form.Item name="location" label="Location">
          <Input />
        </Form.Item>

        <Divider plain>Qualifications</Divider>

        <Space>
          <Form.Item name="licensed" valuePropName="checked">
            <Checkbox>Licensed</Checkbox>
          </Form.Item>
          <Form.Item name="insured" valuePropName="checked">
            <Checkbox>Insured</Checkbox>
          </Form.Item>
          <Form.Item name="rental_experience" valuePropName="checked">
            <Checkbox>Rental Experience</Checkbox>
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
          <TextArea rows={3} />
        </Form.Item>

        <Divider plain>
          Vetting Score{' '}
          <Tooltip title="Auto-calculated based on license, insurance, and years in business. Admin adjustment allows +/-10 points.">
            <InfoCircleOutlined style={{ fontSize: 14, color: '#999' }} />
          </Tooltip>
        </Divider>

        <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text>Base Vetting Score:</Text>
            <Text strong>{vendor.vetting_score ?? 'Not calculated'}</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text>Admin Adjustment:</Text>
            <Text strong style={{ color: (vendor.vetting_admin_adjustment || 0) > 0 ? 'green' : (vendor.vetting_admin_adjustment || 0) < 0 ? 'red' : undefined }}>
              {(vendor.vetting_admin_adjustment || 0) > 0 ? '+' : ''}{vendor.vetting_admin_adjustment || 0}
            </Text>
          </div>
          <Divider style={{ margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text strong>Total Vetting Score:</Text>
            <Text strong style={{ fontSize: 16 }}>
              {vendor.vetting_score != null
                ? Math.min(45, Math.max(0, vendor.vetting_score + (vendor.vetting_admin_adjustment || 0)))
                : 'N/A'}
            </Text>
          </div>
        </div>

        <Form.Item
          name="vetting_admin_adjustment"
          label="Admin Vetting Adjustment"
          extra="Adjust vetting score by -10 to +10 points based on your assessment"
        >
          <Slider
            min={-10}
            max={10}
            marks={{ '-10': '-10', '-5': '-5', 0: '0', 5: '+5', 10: '+10' }}
          />
        </Form.Item>
      </Form>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button icon={<EditOutlined />} onClick={handleStartEdit}>Edit</Button>
      </div>

      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Status">
          <Select
            value={vendor.status}
            style={{ width: 150 }}
            onChange={handleStatusChange}
            options={Object.entries(VENDOR_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          />
        </Descriptions.Item>
        <Descriptions.Item label="Business Name">{vendor.business_name}</Descriptions.Item>
        <Descriptions.Item label="Contact Name">{vendor.contact_name}</Descriptions.Item>
        <Descriptions.Item label="Email">{vendor.email}</Descriptions.Item>
        <Descriptions.Item label="Phone">{vendor.phone || '-'}</Descriptions.Item>
        <Descriptions.Item label="Website">
          {vendor.website ? (
            <a href={vendor.website} target="_blank" rel="noopener noreferrer">{vendor.website}</a>
          ) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Location">{vendor.location || '-'}</Descriptions.Item>
      </Descriptions>

      <Divider>Qualifications</Divider>

      <Descriptions column={2} size="small">
        <Descriptions.Item label="Licensed">{vendor.licensed ? 'Yes' : 'No'}</Descriptions.Item>
        <Descriptions.Item label="Insured">{vendor.insured ? 'Yes' : 'No'}</Descriptions.Item>
        <Descriptions.Item label="Rental Experience">{vendor.rental_experience ? 'Yes' : 'No'}</Descriptions.Item>
      </Descriptions>

      {vendor.qualifications && (
        <>
          <Divider>Qualifications Details</Divider>
          <Text>{vendor.qualifications}</Text>
        </>
      )}

      <Divider>Vetting Score</Divider>

      <Descriptions column={2} size="small">
        <Descriptions.Item label="Years in Business">
          {vendor.years_in_business != null ? `${vendor.years_in_business}+ years` : 'Not set'}
        </Descriptions.Item>
        <Descriptions.Item label="Base Score">{vendor.vetting_score ?? 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="Admin Adjustment">
          <Text style={{ color: (vendor.vetting_admin_adjustment || 0) > 0 ? 'green' : (vendor.vetting_admin_adjustment || 0) < 0 ? 'red' : undefined }}>
            {(vendor.vetting_admin_adjustment || 0) > 0 ? '+' : ''}{vendor.vetting_admin_adjustment || 0}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="Total Vetting">
          <Text strong>
            {vendor.vetting_score != null
              ? Math.min(45, Math.max(0, vendor.vetting_score + (vendor.vetting_admin_adjustment || 0)))
              : 'N/A'}
          </Text>
        </Descriptions.Item>
      </Descriptions>

      <Divider>Performance</Divider>

      <Space>
        <Rate disabled defaultValue={vendor.performance_score} allowHalf />
        <Text>({vendor.total_reviews} reviews)</Text>
      </Space>
    </>
  )
}

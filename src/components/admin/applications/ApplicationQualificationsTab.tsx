'use client'

import { useState } from 'react'
import {
  Descriptions,
  Tag,
  Space,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Checkbox,
  Typography,
  Divider,
} from 'antd'
import { EditOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import {
  Vendor,
  EMPLOYEE_COUNT_OPTIONS,
  JOB_SIZE_RANGE_OPTIONS,
  ACCEPTED_PAYMENTS_OPTIONS,
  CONTACT_PREFERENCE_LABELS,
} from '@/types/database'
import ServiceAreaDisplay from '@/components/ServiceAreaDisplay'
import ServiceAreaAutocomplete from '@/components/ServiceAreaAutocomplete'

const { Text } = Typography
const { TextArea } = Input

interface ApplicationQualificationsTabProps {
  application: Vendor
  onUpdate: (updates: Record<string, unknown>) => Promise<void>
  saving: boolean
}

export default function ApplicationQualificationsTab({ application, onUpdate, saving }: ApplicationQualificationsTabProps) {
  const [editing, setEditing] = useState(false)
  const [form] = Form.useForm()

  const handleStartEdit = () => {
    form.setFieldsValue({
      licensed: application.licensed || false,
      insured: application.insured || false,
      rental_experience: application.rental_experience || false,
      licensed_areas: application.licensed_areas || [],
      qualifications: application.qualifications || '',
      years_in_business: application.years_in_business,
      employee_count: application.employee_count || '',
      emergency_services: application.emergency_services || false,
      job_size_range: application.job_size_range || [],
      service_hours_weekdays: application.service_hours_weekdays || false,
      service_hours_weekends: application.service_hours_weekends || false,
      service_hours_24_7: application.service_hours_24_7 || false,
      accepted_payments: application.accepted_payments || [],
      call_preferences: application.call_preferences ? application.call_preferences.split(', ') : [],
    })
    setEditing(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      await onUpdate({
        licensed: values.licensed,
        insured: values.insured,
        rental_experience: values.rental_experience,
        licensed_areas: values.licensed_areas,
        qualifications: values.qualifications || null,
        years_in_business: values.years_in_business,
        employee_count: values.employee_count || null,
        emergency_services: values.emergency_services,
        job_size_range: values.job_size_range,
        service_hours_weekdays: values.service_hours_weekdays,
        service_hours_weekends: values.service_hours_weekends,
        service_hours_24_7: values.service_hours_24_7,
        accepted_payments: values.accepted_payments,
        call_preferences: values.call_preferences?.length > 0
          ? values.call_preferences.join(', ')
          : null,
      })
      setEditing(false)
    } catch {
      // validation error
    }
  }

  const renderBoolBadge = (value: boolean | null | undefined) => {
    return value
      ? <Tag icon={<CheckCircleOutlined />} color="success">Yes</Tag>
      : <Tag icon={<CloseCircleOutlined />} color="default">No</Tag>
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

        <Divider plain>Credentials</Divider>
        <Space size="large">
          <Form.Item name="licensed" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Licensed</Checkbox>
          </Form.Item>
          <Form.Item name="insured" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Insured</Checkbox>
          </Form.Item>
          <Form.Item name="rental_experience" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Rental Experience</Checkbox>
          </Form.Item>
        </Space>

        <Form.Item label="Licensed Areas" name="licensed_areas" style={{ marginTop: 16 }}>
          <ServiceAreaAutocomplete
            value={form.getFieldValue('licensed_areas') || []}
            onChange={(values) => form.setFieldValue('licensed_areas', values)}
          />
        </Form.Item>

        <Form.Item label="Experience & Qualifications" name="qualifications">
          <TextArea rows={3} placeholder="Describe experience and qualifications..." />
        </Form.Item>

        <Divider plain>Business Details</Divider>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item label="Years in Business" name="years_in_business">
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Employees" name="employee_count">
            <Select
              placeholder="Select range"
              allowClear
              options={EMPLOYEE_COUNT_OPTIONS}
            />
          </Form.Item>
        </div>

        <Form.Item name="emergency_services" valuePropName="checked">
          <Checkbox>Offers Emergency Services (24/7)</Checkbox>
        </Form.Item>

        <Form.Item label="Job Size Range" name="job_size_range">
          <Select
            mode="multiple"
            placeholder="Select job sizes"
            options={JOB_SIZE_RANGE_OPTIONS}
          />
        </Form.Item>

        <Divider plain>Service Hours</Divider>
        <Space size="large">
          <Form.Item name="service_hours_weekdays" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Weekdays</Checkbox>
          </Form.Item>
          <Form.Item name="service_hours_weekends" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>Weekends</Checkbox>
          </Form.Item>
          <Form.Item name="service_hours_24_7" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>24/7 Available</Checkbox>
          </Form.Item>
        </Space>

        <Form.Item label="Accepted Payments" name="accepted_payments" style={{ marginTop: 16 }}>
          <Select
            mode="multiple"
            placeholder="Select payment methods"
            options={ACCEPTED_PAYMENTS_OPTIONS}
          />
        </Form.Item>

        <Divider plain>Contact Preferences</Divider>
        <Form.Item label="Best Way to Reach" name="call_preferences">
          <Select
            mode="multiple"
            placeholder="Select contact methods"
            options={Object.entries(CONTACT_PREFERENCE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
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

      <Descriptions column={3} bordered size="small">
        <Descriptions.Item label="Licensed">{renderBoolBadge(application.licensed)}</Descriptions.Item>
        <Descriptions.Item label="Insured">{renderBoolBadge(application.insured)}</Descriptions.Item>
        <Descriptions.Item label="Rental Experience">{renderBoolBadge(application.rental_experience)}</Descriptions.Item>
      </Descriptions>

      {application.licensed_areas && application.licensed_areas.length > 0 && (
        <>
          <Divider>Licensed Areas</Divider>
          <ServiceAreaDisplay serviceAreas={application.licensed_areas} />
        </>
      )}

      {application.license_not_required && (
        <Text type="secondary" italic style={{ display: 'block', marginTop: 8 }}>
          Vendor indicated: License not required for their services
        </Text>
      )}
      {application.not_currently_licensed && (
        <Text type="secondary" italic style={{ display: 'block', marginTop: 8 }}>
          Vendor indicated: Not currently licensed
        </Text>
      )}

      {application.qualifications && (
        <>
          <Divider>Qualifications</Divider>
          <Text>{application.qualifications}</Text>
        </>
      )}

      <Divider>Business Details</Divider>
      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label="Years in Business">
          {application.years_in_business != null ? `${application.years_in_business}+ years` : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Employees">
          {application.employee_count
            ? EMPLOYEE_COUNT_OPTIONS.find(o => o.value === application.employee_count)?.label || application.employee_count
            : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Emergency Services">
          {renderBoolBadge(application.emergency_services)}
        </Descriptions.Item>
        <Descriptions.Item label="Job Sizes">
          {application.job_size_range && application.job_size_range.length > 0
            ? <Space wrap size="small">{application.job_size_range.map(s => <Tag key={s}>{JOB_SIZE_RANGE_OPTIONS.find(o => o.value === s)?.label || s}</Tag>)}</Space>
            : '-'}
        </Descriptions.Item>
      </Descriptions>

      <Divider>Service Hours</Divider>
      <Space size="large">
        <Text>Weekdays: {application.service_hours_weekdays ? <Tag color="success">Yes</Tag> : <Tag>No</Tag>}</Text>
        <Text>Weekends: {application.service_hours_weekends ? <Tag color="success">Yes</Tag> : <Tag>No</Tag>}</Text>
        <Text>24/7: {application.service_hours_24_7 ? <Tag color="success">Yes</Tag> : <Tag>No</Tag>}</Text>
      </Space>

      <Divider>Accepted Payments</Divider>
      {application.accepted_payments && application.accepted_payments.length > 0 ? (
        <Space wrap size="small">
          {application.accepted_payments.map(p => (
            <Tag key={p}>{ACCEPTED_PAYMENTS_OPTIONS.find(o => o.value === p)?.label || p}</Tag>
          ))}
        </Space>
      ) : (
        <Text type="secondary">Not specified</Text>
      )}

      <Divider>Contact Preferences</Divider>
      {application.call_preferences ? (
        <Space wrap size="small">
          {application.call_preferences.split(', ').map(p => (
            <Tag key={p}>{CONTACT_PREFERENCE_LABELS[p as keyof typeof CONTACT_PREFERENCE_LABELS] || p}</Tag>
          ))}
        </Space>
      ) : (
        <Text type="secondary">Not specified</Text>
      )}
    </>
  )
}

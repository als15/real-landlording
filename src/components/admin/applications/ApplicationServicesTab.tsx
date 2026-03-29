'use client'

import { useState } from 'react'
import { Descriptions, Tag, Space, Button, Form, Select, Typography, Divider } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { Vendor, ServiceCategory } from '@/types/database'
import { useServiceTaxonomy } from '@/hooks/useServiceTaxonomy'
import ServiceAreaDisplay from '@/components/ServiceAreaDisplay'
import ServiceAreaAutocomplete from '@/components/ServiceAreaAutocomplete'

const { Text } = Typography

interface ApplicationServicesTabProps {
  application: Vendor
  onUpdate: (updates: Record<string, unknown>) => Promise<void>
  saving: boolean
}

export default function ApplicationServicesTab({ application, onUpdate, saving }: ApplicationServicesTabProps) {
  const [editing, setEditing] = useState(false)
  const [form] = Form.useForm()
  const [selectedServices, setSelectedServices] = useState<ServiceCategory[]>(application.services || [])
  const { labels: SERVICE_TYPE_LABELS, taxonomyMap: SERVICE_TAXONOMY } = useServiceTaxonomy()

  const getServiceClassifications = (services: ServiceCategory[]) => {
    return services
      .map(service => {
        const config = SERVICE_TAXONOMY[service]
        if (!config || config.classifications.length === 0) return null
        return {
          service,
          label: config.label,
          classifications: config.classifications,
        }
      })
      .filter(Boolean) as Array<{
      service: ServiceCategory
      label: string
      classifications: Array<{ label: string; options: string[] }>
    }>
  }

  const serviceClassifications = getServiceClassifications(selectedServices)

  const handleStartEdit = () => {
    // Reconstruct service_specialties form fields from flat storage format
    const serviceSpecialtiesForm: Record<string, Record<string, string[]>> = {}
    if (application.service_specialties) {
      for (const [service, specialties] of Object.entries(application.service_specialties)) {
        const config = SERVICE_TAXONOMY[service as ServiceCategory]
        if (config && config.classifications.length > 0) {
          serviceSpecialtiesForm[service] = {}
          const firstClassification = config.classifications[0]
          serviceSpecialtiesForm[service][firstClassification.label] = specialties as string[]
        }
      }
    }

    form.setFieldsValue({
      services: application.services || [],
      service_specialties: serviceSpecialtiesForm,
      service_areas: application.service_areas || [],
    })
    setSelectedServices(application.services || [])
    setEditing(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()

      // Transform service_specialties from nested form structure to flat storage format
      let serviceSpecialties: Record<string, string[]> | null = null
      if (values.service_specialties && typeof values.service_specialties === 'object') {
        serviceSpecialties = {}
        for (const [service, classifications] of Object.entries(values.service_specialties)) {
          if (classifications && typeof classifications === 'object') {
            const allOptions: string[] = []
            for (const options of Object.values(classifications as Record<string, string[]>)) {
              if (Array.isArray(options)) {
                allOptions.push(...options)
              }
            }
            if (allOptions.length > 0) {
              serviceSpecialties[service] = allOptions
            }
          }
        }
        if (Object.keys(serviceSpecialties).length === 0) {
          serviceSpecialties = null
        }
      }

      await onUpdate({
        services: values.services,
        service_specialties: serviceSpecialties,
        service_areas: values.service_areas,
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

        <Form.Item label="Services" name="services">
          <Select
            mode="multiple"
            placeholder="Select services"
            options={Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            onChange={(values: ServiceCategory[]) => setSelectedServices(values)}
          />
        </Form.Item>

        {serviceClassifications.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Service Specialties</Text>
            {serviceClassifications.map(({ service, label, classifications }) => (
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

        <Form.Item label="Service Areas" name="service_areas">
          <ServiceAreaAutocomplete
            value={form.getFieldValue('service_areas') || []}
            onChange={(values) => form.setFieldValue('service_areas', values)}
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
        <Descriptions.Item label="Services">
          <Space wrap size="small">
            {(application.services || []).map((s) => (
              <Tag key={s} color="blue">
                {SERVICE_TYPE_LABELS[s] || s}
              </Tag>
            ))}
            {(!application.services || application.services.length === 0) && '-'}
          </Space>
        </Descriptions.Item>
      </Descriptions>

      {application.service_specialties && Object.keys(application.service_specialties).length > 0 && (
        <>
          <Divider>Service Specialties</Divider>
          {Object.entries(application.service_specialties).map(([service, specialties]) => (
            <div key={service} style={{ marginBottom: 12 }}>
              <Text strong>{SERVICE_TYPE_LABELS[service] || service}: </Text>
              <Space wrap size="small">
                {(specialties as string[]).map(s => (
                  <Tag key={s}>{s}</Tag>
                ))}
              </Space>
            </div>
          ))}
        </>
      )}

      <Divider>Service Areas</Divider>
      {application.service_areas && application.service_areas.length > 0 ? (
        <ServiceAreaDisplay serviceAreas={application.service_areas} />
      ) : (
        <Text type="secondary">No service areas specified</Text>
      )}
    </>
  )
}

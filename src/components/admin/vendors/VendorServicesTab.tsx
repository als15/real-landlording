'use client'

import { useState } from 'react'
import { Tag, Space, Button, Form, Select, Typography, Divider } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { Vendor, ServiceCategory } from '@/types/database'
import { useServiceTaxonomy } from '@/hooks/useServiceTaxonomy'
import ServiceAreaAutocomplete from '@/components/ServiceAreaAutocomplete'
import ServiceAreaDisplay from '@/components/ServiceAreaDisplay'

const { Text } = Typography

interface VendorServicesTabProps {
  vendor: Vendor
  onUpdate: (updates: Record<string, unknown>) => Promise<void>
  saving: boolean
}

export default function VendorServicesTab({ vendor, onUpdate, saving }: VendorServicesTabProps) {
  const [editing, setEditing] = useState(false)
  const [form] = Form.useForm()
  const [selectedServices, setSelectedServices] = useState<ServiceCategory[]>([])
  const { labels: SERVICE_TYPE_LABELS, taxonomyMap: SERVICE_TAXONOMY, categories: serviceCategoriesRaw, groups: serviceGroupsRaw } = useServiceTaxonomy()

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

  const groupedCategories = serviceGroupsRaw.map(g => ({
    group: g.key,
    label: g.label,
    categories: serviceCategoriesRaw
      .filter(c => c.group_key === g.key)
      .map(c => ({ value: c.key, label: c.label })),
  }))

  const handleStartEdit = () => {
    setSelectedServices(vendor.services || [])

    // Build service_specialties form fields from existing data
    const serviceSpecialtiesForm: Record<string, Record<string, string[]>> = {}
    if (vendor.service_specialties) {
      for (const [service, specialties] of Object.entries(vendor.service_specialties)) {
        const config = SERVICE_TAXONOMY[service as ServiceCategory]
        if (config && config.classifications.length > 0) {
          serviceSpecialtiesForm[service] = {}
          const firstClassification = config.classifications[0]
          serviceSpecialtiesForm[service][firstClassification.label] = specialties as string[]
        }
      }
    }

    form.setFieldsValue({
      services: vendor.services,
      service_specialties: serviceSpecialtiesForm,
      service_areas: vendor.service_areas,
    })
    setEditing(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()

      // Transform service_specialties from nested form structure to flat storage format
      let serviceSpecialties: Record<string, string[]> | null = null
      const formSpecialties = values.service_specialties as Record<string, Record<string, string[]>> | undefined
      if (formSpecialties && typeof formSpecialties === 'object') {
        serviceSpecialties = {}
        for (const [service, classifications] of Object.entries(formSpecialties)) {
          if (classifications && typeof classifications === 'object') {
            const allOptions: string[] = []
            for (const options of Object.values(classifications)) {
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
            onChange={(values: ServiceCategory[]) => setSelectedServices(values)}
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

        {serviceClassifications.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Service Specialties</Text>
            {serviceClassifications.map(({ service, label, classifications }) => (
              <div
                key={service}
                style={{ marginBottom: 12, padding: 12, background: '#f5f5f5', borderRadius: 8 }}
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
      </Form>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button icon={<EditOutlined />} onClick={handleStartEdit}>Edit</Button>
      </div>

      <Divider plain>Services</Divider>

      <Space wrap>
        {vendor.services.map(s => (
          <Tag key={s} color="blue">
            {SERVICE_TYPE_LABELS[s] || s}
          </Tag>
        ))}
      </Space>

      {vendor.service_specialties && Object.keys(vendor.service_specialties).length > 0 && (
        <>
          <Divider plain>Service Specialties</Divider>
          {Object.entries(vendor.service_specialties).map(([service, specialties]) => (
            <div key={service} style={{ marginBottom: 8 }}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>
                {SERVICE_TYPE_LABELS[service] || service}:
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

      <Divider plain>Service Areas</Divider>

      <ServiceAreaDisplay serviceAreas={vendor.service_areas} />
    </>
  )
}

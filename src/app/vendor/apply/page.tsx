'use client'

import { useState } from 'react'
import { Layout, Card, Form, Input, Select, Button, Checkbox, Typography, Space, Row, Col, Divider, App, Result } from 'antd'
import { CheckCircleOutlined, DollarOutlined, ThunderboltOutlined, SafetyCertificateOutlined, TeamOutlined } from '@ant-design/icons'
import { getGroupedServiceCategories, CONTACT_PREFERENCE_LABELS, SERVICE_TAXONOMY, ServiceCategory, FINISH_LEVEL_LABELS } from '@/types/database'
import Link from 'next/link'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import { brandColors } from '@/theme/config'
import AddressAutocomplete, { AddressData } from '@/components/AddressAutocomplete'
import ServiceAreaAutocomplete from '@/components/ServiceAreaAutocomplete'

const { Content } = Layout
const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const benefits = [
  {
    icon: <DollarOutlined style={{ fontSize: 24 }} />,
    title: 'Qualified Leads',
    description: 'Get connected with landlords actively looking for your services'
  },
  {
    icon: <ThunderboltOutlined style={{ fontSize: 24 }} />,
    title: 'No Marketing Spend',
    description: 'We bring the customers to you — focus on what you do best'
  },
  {
    icon: <SafetyCertificateOutlined style={{ fontSize: 24 }} />,
    title: 'Build Your Reputation',
    description: 'Collect reviews and grow your presence in the landlord community'
  },
  {
    icon: <TeamOutlined style={{ fontSize: 24 }} />,
    title: 'Join 100+ Vendors',
    description: "Be part of Philadelphia's trusted contractor network"
  }
]

export default function VendorApplyPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [selectedServices, setSelectedServices] = useState<ServiceCategory[]>([])
  const { message } = App.useApp()

  const groupedCategories = getGroupedServiceCategories()

  // Get classifications (equipment types) for selected services
  const getServiceClassifications = (services: ServiceCategory[]) => {
    return services
      .map(service => {
        const config = SERVICE_TAXONOMY[service]
        if (!config || config.classifications.length === 0) return null
        return {
          service,
          label: config.label,
          classifications: config.classifications
        }
      })
      .filter(Boolean) as Array<{
      service: ServiceCategory
      label: string
      classifications: Array<{ label: string; options: string[] }>
    }>
  }

  const serviceClassifications = getServiceClassifications(selectedServices)

  // Check if any selected service has finish level enabled
  const hasFinishLevelService = selectedServices.some(service => {
    const config = SERVICE_TAXONOMY[service]
    return config?.finishLevelEnabled === true
  })

  const finishLevelOptions = Object.entries(FINISH_LEVEL_LABELS).map(([value, label]) => ({
    value,
    label
  }))

  const onFinish = async (values: Record<string, unknown>) => {
    setLoading(true)
    try {
      const response = await fetch('/api/vendor/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to submit application')
      }

      setSubmitted(true)
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <Layout style={{ minHeight: '100vh', background: brandColors.background }}>
        <PublicHeader showRequestButton={true} showSignIn={false} />
        <Content style={{ padding: '48px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Card
            style={{
              maxWidth: 500,
              textAlign: 'center',
              borderRadius: 16,
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)'
            }}
          >
            <Result
              icon={<CheckCircleOutlined style={{ color: brandColors.success }} />}
              title="Application Submitted!"
              subTitle="Thank you for applying to join our vendor network. We'll review your application and get back to you within 2-3 business days."
              extra={[
                <a href="https://www.reallandlording.com" key="home">
                  <Button type="primary" size="large">
                    Back to Home
                  </Button>
                </a>
              ]}
            />
          </Card>
        </Content>
        <PublicFooter />
      </Layout>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh', background: brandColors.background }}>
      <PublicHeader showRequestButton={true} showSignIn={false} />

      {/* Hero Section */}
      <div
        style={{
          background: `linear-gradient(135deg, ${brandColors.secondary} 0%, #3d5a6b 100%)`,
          padding: '48px 24px',
          textAlign: 'center'
        }}
      >
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <Title style={{ color: brandColors.white, fontSize: 36, marginBottom: 16 }}>Join Our Vendor Network</Title>
          <Paragraph style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18 }}>Get connected with Philadelphia landlords who need your services. No marketing spend — we bring qualified leads directly to you.</Paragraph>
        </div>
      </div>

      <Content style={{ padding: '48px 24px' }}>
        <Row gutter={[48, 32]} justify="center" style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Benefits Column */}
          <Col xs={24} lg={8}>
            <div style={{ position: 'sticky', top: 100 }}>
              <Title level={4} style={{ marginBottom: 24, color: brandColors.primary }}>
                Why Join Real Landlording?
              </Title>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      gap: 16,
                      padding: 16,
                      background: brandColors.white,
                      borderRadius: 12,
                      border: `1px solid ${brandColors.border}`
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        background: `${brandColors.accent}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: brandColors.accent,
                        flexShrink: 0
                      }}
                    >
                      {benefit.icon}
                    </div>
                    <div>
                      <Text strong style={{ display: 'block', marginBottom: 4 }}>
                        {benefit.title}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {benefit.description}
                      </Text>
                    </div>
                  </div>
                ))}
              </Space>
            </div>
          </Col>

          {/* Form Column */}
          <Col xs={24} lg={16}>
            <Card
              style={{
                borderRadius: 16,
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
                border: `1px solid ${brandColors.border}`
              }}
            >
              <Form form={form} layout="vertical" onFinish={onFinish}>
                <Title level={4}>Contact Information</Title>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="contact_name" label="Your Name" rules={[{ required: true, message: 'Required' }]}>
                      <Input placeholder="John Smith" size="large" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="business_name" label="Business Name" rules={[{ required: true, message: 'Required' }]}>
                      <Input placeholder="Smith Plumbing LLC" size="large" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="email"
                      label="Email"
                      rules={[
                        { required: true, message: 'Required' },
                        { type: 'email', message: 'Invalid email' }
                      ]}
                    >
                      <Input placeholder="john@smithplumbing.com" size="large" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="phone" label="Phone" rules={[{ required: true, message: 'Required' }]}>
                      <Input placeholder="(215) 555-0123" size="large" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="website" label="Website (optional)">
                  <Input placeholder="https://smithplumbing.com" size="large" />
                </Form.Item>

                <Divider />
                <Title level={4}>Services & Coverage</Title>

                <Form.Item name="services" label="Services You Offer" rules={[{ required: true, message: 'Select at least one service' }]}>
                  <Select
                    mode="multiple"
                    placeholder="Select all services you provide"
                    size="large"
                    showSearch
                    onChange={(values: ServiceCategory[]) => setSelectedServices(values)}
                    filterOption={(input, option) => {
                      const children = option?.children
                      if (children && typeof children === 'string') {
                        return (children as string).toLowerCase().includes(input.toLowerCase())
                      }
                      return false
                    }}
                  >
                    {groupedCategories.map(group => (
                      <Select.OptGroup key={group.group} label={group.label}>
                        {group.categories.map(cat => (
                          <Select.Option key={cat.value} value={cat.value}>
                            {cat.label}
                          </Select.Option>
                        ))}
                      </Select.OptGroup>
                    ))}
                  </Select>
                </Form.Item>

                {/* Dynamic Equipment Types based on selected services */}
                {serviceClassifications.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <Text strong style={{ display: 'block', marginBottom: 12 }}>
                      What work do you cover in this service category?
                    </Text>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
                      Select all that apply for each service category
                    </Text>
                    {serviceClassifications.map(({ service, label, classifications }) => (
                      <div
                        key={service}
                        style={{
                          marginBottom: 16,
                          padding: 16,
                          background: `${brandColors.accent}08`,
                          borderRadius: 8,
                          border: `1px solid ${brandColors.border}`
                        }}
                      >
                        <Text strong style={{ display: 'block', marginBottom: 12, color: brandColors.secondary }}>
                          {label}
                        </Text>
                        {classifications.map(classification => {
                          // Adjust labels for vendor context
                          const vendorLabel = classification.label === 'Service Needed' ? 'Services Provided' : classification.label
                          return (
                            <Form.Item key={`${service}_${classification.label}`} name={['service_specialties', service, classification.label]} label={vendorLabel} style={{ marginBottom: 12 }}>
                              <Select mode="multiple" placeholder={`Select ${vendorLabel.toLowerCase()}`} size="middle" options={classification.options.map(opt => ({ value: opt, label: opt }))} />
                            </Form.Item>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )}

                {hasFinishLevelService && (
                  <Form.Item
                    name="finish_levels"
                    label="Finish Levels You Work With"
                    extra="Select all finish levels you can provide for services like painting, flooring, or general contracting"
                  >
                    <Select
                      mode="multiple"
                      placeholder="Select finish levels"
                      size="large"
                      options={finishLevelOptions}
                    />
                  </Form.Item>
                )}

                <Form.Item name="service_areas" label="Service Areas" rules={[{ required: true, message: 'Add at least one service area' }]} extra="Search for neighborhoods, cities, or enter zip codes">
                  <ServiceAreaAutocomplete placeholder="Search for neighborhoods, cities, or enter zip codes..." />
                </Form.Item>

                <Form.Item name="location" label="Business Address" extra="Start typing to search for your business address">
                  <AddressAutocomplete
                    placeholder="Start typing your business address..."
                    onAddressSelect={(data: AddressData) => {
                      // Also set lat/lng if we want to store them
                      form.setFieldValue('location', data.formatted_address)
                    }}
                  />
                </Form.Item>

                <Divider />
                <Title level={4}>Qualifications</Title>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="years_in_business" label="Years in Business" rules={[{ required: true, message: 'Required' }]}>
                      <Select
                        placeholder="Select years of experience"
                        size="large"
                        options={[
                          { value: 0, label: 'Less than 1 year' },
                          { value: 1, label: '1 year' },
                          { value: 2, label: '2 years' },
                          { value: 3, label: '3 years' },
                          { value: 4, label: '4 years' },
                          { value: 5, label: '5+ years' },
                          { value: 10, label: '10+ years' },
                          { value: 20, label: '20+ years' }
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
                  <Form.Item name="licensed" valuePropName="checked" noStyle>
                    <Checkbox>I am licensed in Pennsylvania</Checkbox>
                  </Form.Item>
                  <Form.Item name="insured" valuePropName="checked" noStyle>
                    <Checkbox>I carry liability insurance</Checkbox>
                  </Form.Item>
                  <Form.Item name="rental_experience" valuePropName="checked" noStyle>
                    <Checkbox>I have experience working with rental properties</Checkbox>
                  </Form.Item>
                </Space>

                <Form.Item name="qualifications" label="Tell us about your experience" rules={[{ required: true, message: 'Please describe your experience' }]}>
                  <TextArea rows={4} placeholder="Years in business, certifications, specialties, notable projects..." size="large" />
                </Form.Item>

                <Form.Item name="call_preferences" label="Best way to reach you">
                  <Select
                    placeholder="Select preference"
                    size="large"
                    allowClear
                    options={Object.entries(CONTACT_PREFERENCE_LABELS).map(([value, label]) => ({
                      value,
                      label
                    }))}
                  />
                </Form.Item>

                <Divider />

                <Form.Item
                  name="terms_accepted"
                  valuePropName="checked"
                  rules={[
                    {
                      validator: (_, value) => (value ? Promise.resolve() : Promise.reject('You must accept the terms'))
                    }
                  ]}
                >
                  <Checkbox>
                    I have read and agree to the{' '}
                    <Link href="/terms/vendor" target="_blank" style={{ color: brandColors.accent }}>
                      Vendor Terms of Service & Privacy Policy
                    </Link>
                    , including responding to referrals within 24 hours and maintaining professional service standards. I understand Real Landlording may charge referral fees for successful jobs.
                  </Checkbox>
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading} size="large" block>
                    Submit Application
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Text type="secondary">
                Already a vendor?{' '}
                <Link href="/vendor/login" style={{ color: brandColors.accent }}>
                  Sign in to your dashboard
                </Link>
              </Text>
            </div>
          </Col>
        </Row>
      </Content>

      <PublicFooter />
    </Layout>
  )
}

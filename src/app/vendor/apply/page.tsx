'use client'

import { useState } from 'react'
import { Layout, Card, Form, Input, Select, Button, Checkbox, Typography, Space, Row, Col, Divider, App, Result, Steps, Switch } from 'antd'
import { CheckCircleOutlined, DollarOutlined, ThunderboltOutlined, SafetyCertificateOutlined, TeamOutlined, AppstoreOutlined, ArrowLeftOutlined, ArrowRightOutlined, InstagramOutlined, FacebookOutlined, LinkedinOutlined, SendOutlined } from '@ant-design/icons'
import {
  getGroupedServiceCategories,
  CONTACT_PREFERENCE_LABELS,
  SERVICE_TAXONOMY,
  ServiceCategory,
  FINISH_LEVEL_LABELS,
  EMPLOYEE_COUNT_OPTIONS,
  JOB_SIZE_RANGE_OPTIONS,
  ACCEPTED_PAYMENTS_OPTIONS,
  REFERRAL_SOURCE_OPTIONS
} from '@/types/database'
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
    title: 'Join a Network of Trusted Pros',
    description: 'Supporting Philly investors'
  },
  {
    icon: <AppstoreOutlined style={{ fontSize: 24 }} />,
    title: 'Diverse Service Requests',
    description: 'From trades and maintenance to legal, financial, and advisory'
  }
]

const STEPS = [
  { title: 'Contact', description: 'Your info' },
  { title: 'Services', description: 'What you offer' },
  { title: 'Experience', description: 'Qualifications' },
  { title: 'Business', description: 'Details' },
  { title: 'Submit', description: 'Review & apply' },
]

export default function VendorApplyPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedServices, setSelectedServices] = useState<ServiceCategory[]>([])
  const [referralSource, setReferralSource] = useState<string | null>(null)
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

  // Fields required per step
  const fieldsPerStep: Record<number, string[]> = {
    0: ['contact_name', 'business_name', 'email', 'phone'],
    1: ['services', 'service_areas'],
    2: ['years_in_business', 'qualifications'],
    3: [], // Business details step - all optional
    4: ['terms_accepted'],
  }

  // Validate current step fields before proceeding
  const validateStep = async (step: number): Promise<boolean> => {
    const fields = fieldsPerStep[step] || []
    if (fields.length === 0) return true

    try {
      await form.validateFields(fields)
      return true
    } catch {
      return false
    }
  }

  // Find which step has validation errors
  const findStepWithErrors = async (): Promise<number | null> => {
    for (let step = 0; step < STEPS.length; step++) {
      const fields = fieldsPerStep[step] || []
      if (fields.length === 0) continue

      try {
        await form.validateFields(fields)
      } catch {
        return step
      }
    }
    return null
  }

  const handleNext = async () => {
    const isValid = await validateStep(currentStep)
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Handle clicking on a step to navigate
  const handleStepClick = async (step: number) => {
    // Allow going back to any previous step
    if (step < currentStep) {
      setCurrentStep(step)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    // For forward navigation, validate all steps in between
    for (let s = currentStep; s < step; s++) {
      const isValid = await validateStep(s)
      if (!isValid) {
        setCurrentStep(s)
        message.warning(`Please complete Step ${s + 1} before proceeding`)
        return
      }
    }

    setCurrentStep(step)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onFinish = async (values: Record<string, unknown>) => {
    // First validate all steps
    const stepWithErrors = await findStepWithErrors()
    if (stepWithErrors !== null) {
      setCurrentStep(stepWithErrors)
      message.error(`Please complete all required fields in Step ${stepWithErrors + 1}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

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

  // Step content renderers
  const renderStep1ContactInfo = () => (
    <>
      <Title level={4}>Contact Information</Title>
      <Paragraph type="secondary">How can landlords and our team reach you?</Paragraph>

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
          <Form.Item
            name="phone"
            label="Phone"
            rules={[
              { required: true, message: 'Required' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve()
                  // Strip non-digits and check for valid US phone (10 digits, optionally with leading 1)
                  const digits = value.replace(/\D/g, '')
                  const normalized = digits.startsWith('1') && digits.length === 11 ? digits.slice(1) : digits
                  if (normalized.length !== 10) {
                    return Promise.reject('Please enter a valid 10-digit phone number')
                  }
                  return Promise.resolve()
                }
              }
            ]}
          >
            <Input placeholder="(215) 555-0123" size="large" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="website" label="Website (optional)">
        <Input placeholder="https://smithplumbing.com" size="large" />
      </Form.Item>

      <Form.Item name="location" label="Business Address (optional)" extra="Start typing to search for your business address">
        <AddressAutocomplete
          placeholder="Start typing your business address..."
          onAddressSelect={(data: AddressData) => {
            form.setFieldValue('location', data.formatted_address)
          }}
        />
      </Form.Item>
    </>
  )

  const renderStep2Services = () => (
    <>
      <Title level={4}>Services & Coverage</Title>
      <Paragraph type="secondary">What services do you offer and where do you work?</Paragraph>

      <Form.Item name="services" label="Services You Offer" rules={[{ required: true, message: 'Select at least one service' }]}>
        <Select
          mode="multiple"
          placeholder="Select all services you provide"
          size="large"
          showSearch
          virtual={false}
          listHeight={350}
          popupClassName="mobile-friendly-dropdown"
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

      <Form.Item
        name="licensed_areas"
        label="Licensed Locations (optional)"
        extra="Search for cities, states, or enter zip codes where you hold a license"
      >
        <ServiceAreaAutocomplete placeholder="Search for locations where you are licensed..." />
      </Form.Item>
    </>
  )

  const renderStep3Qualifications = () => (
    <>
      <Title level={4}>Experience & Qualifications</Title>
      <Paragraph type="secondary">Tell us about your experience and how you work</Paragraph>

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

      <Form.Item name="qualifications" label="Tell us about your experience" rules={[{ required: true, message: 'Please describe your experience' }]}>
        <TextArea rows={4} placeholder="Years in business, certifications, specialties, notable projects..." size="large" />
      </Form.Item>

      <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
        <Form.Item name="insured" valuePropName="checked" noStyle>
          <Checkbox>I carry liability insurance</Checkbox>
        </Form.Item>
        <Form.Item name="rental_experience" valuePropName="checked" noStyle>
          <Checkbox>I have experience working with rental properties</Checkbox>
        </Form.Item>
      </Space>

      <Form.Item name="call_preferences" label="Best way to reach you">
        <Select
          mode="multiple"
          placeholder="Select preferences"
          size="large"
          allowClear
          options={Object.entries(CONTACT_PREFERENCE_LABELS).map(([value, label]) => ({
            value,
            label
          }))}
        />
      </Form.Item>
    </>
  )

  const renderStep4BusinessDetails = () => (
    <>
      <Title level={4}>Business Details</Title>
      <Paragraph type="secondary">Help us understand your business better</Paragraph>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item name="employee_count" label="Number of Employees">
            <Select
              placeholder="Select team size"
              size="large"
              allowClear
              options={EMPLOYEE_COUNT_OPTIONS}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="job_size_range" label="Typical Job Size Range">
            <Select
              mode="multiple"
              placeholder="Select job sizes you handle"
              size="large"
              options={JOB_SIZE_RANGE_OPTIONS}
            />
          </Form.Item>
        </Col>
      </Row>

      <Text strong style={{ display: 'block', marginBottom: 12, marginTop: 8 }}>Service Hours</Text>

      <Row gutter={[24, 16]}>
        <Col xs={24} sm={8}>
          <Form.Item name="service_hours_weekdays" valuePropName="checked" noStyle>
            <Checkbox>Weekdays</Checkbox>
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="service_hours_weekends" valuePropName="checked" noStyle>
            <Checkbox>Weekends</Checkbox>
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="emergency_services" valuePropName="checked" noStyle>
            <Checkbox>24/7 Emergency Services</Checkbox>
          </Form.Item>
        </Col>
      </Row>

      <Text strong style={{ display: 'block', marginBottom: 12, marginTop: 24 }}>Payment & Social</Text>

      <Form.Item name="accepted_payments" label="Accepted Forms of Payment">
        <Select
          mode="multiple"
          placeholder="Select payment methods you accept"
          size="large"
          options={ACCEPTED_PAYMENTS_OPTIONS}
        />
      </Form.Item>

      <Text strong style={{ display: 'block', marginBottom: 12 }}>Social Media (optional)</Text>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item name="social_instagram">
            <Input prefix={<InstagramOutlined />} placeholder="Instagram handle" size="large" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="social_facebook">
            <Input prefix={<FacebookOutlined />} placeholder="Facebook page" size="large" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="social_linkedin">
            <Input prefix={<LinkedinOutlined />} placeholder="LinkedIn profile" size="large" />
          </Form.Item>
        </Col>
      </Row>

      <Text strong style={{ display: 'block', marginBottom: 12, marginTop: 24 }}>How Did You Find Us?</Text>

      <Form.Item name="referral_source" label="How did you hear about us?">
        <Select
          placeholder="Select an option"
          size="large"
          allowClear
          options={REFERRAL_SOURCE_OPTIONS}
          onChange={(value) => setReferralSource(value)}
        />
      </Form.Item>

      {referralSource === 'friend_colleague' && (
        <Form.Item name="referral_source_name" label="Who referred you?">
          <Input placeholder="Name of friend or colleague" size="large" />
        </Form.Item>
      )}
    </>
  )

  const renderStep5Review = () => (
    <>
      <Title level={4}>Review & Submit</Title>
      <Paragraph type="secondary">Please review your information and accept the terms to submit your application.</Paragraph>

      <div style={{
        background: `${brandColors.accent}08`,
        padding: 24,
        borderRadius: 12,
        marginBottom: 24,
        border: `1px solid ${brandColors.border}`
      }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          By submitting this application, you confirm that all information provided is accurate.
          Our team will review your application and contact you within 2-3 business days.
        </Text>
      </div>

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
          <a href="/terms/vendor" target="_blank" rel="noopener noreferrer" style={{ color: brandColors.accent }}>
            Vendor Terms of Service & Privacy Policy
          </a>
          , including responding to referrals within 24 hours and maintaining professional service standards. I understand Real Landlording may charge referral fees for successful jobs.
        </Checkbox>
      </Form.Item>
    </>
  )

  // Render all steps but only show current one (keeps form values preserved)
  const renderAllSteps = () => (
    <>
      <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
        {renderStep1ContactInfo()}
      </div>
      <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
        {renderStep2Services()}
      </div>
      <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
        {renderStep3Qualifications()}
      </div>
      <div style={{ display: currentStep === 3 ? 'block' : 'none' }}>
        {renderStep4BusinessDetails()}
      </div>
      <div style={{ display: currentStep === 4 ? 'block' : 'none' }}>
        {renderStep5Review()}
      </div>
    </>
  )

  return (
    <Layout style={{ minHeight: '100vh', background: brandColors.background }}>
      <PublicHeader showRequestButton={true} showSignIn={false} />

      {/* Hero Section */}
      <div
        className="vendor-hero"
        style={{
          background: `linear-gradient(135deg, ${brandColors.secondary} 0%, #3d5a6b 100%)`,
          padding: '32px 16px',
          textAlign: 'center'
        }}
      >
        <style jsx global>{`
          @media (min-width: 768px) {
            .vendor-hero {
              padding: 48px 24px !important;
            }
            .vendor-hero-title {
              font-size: 36px !important;
            }
            .vendor-hero-subtitle {
              font-size: 18px !important;
            }
            .vendor-content {
              padding: 48px 24px !important;
            }
            .vendor-form-card {
              padding: 24px !important;
            }
            .vendor-steps .ant-steps-item-title {
              font-size: 14px !important;
            }
          }
          .vendor-steps .ant-steps-item-title {
            font-size: 12px;
          }
          .vendor-steps .ant-steps-item-description {
            display: none;
          }
          @media (min-width: 768px) {
            .vendor-steps .ant-steps-item-description {
              display: block;
            }
          }
          /* Mobile-friendly dropdown scrolling */
          .mobile-friendly-dropdown .rc-virtual-list-holder {
            -webkit-overflow-scrolling: touch !important;
            overscroll-behavior: contain;
          }
          .mobile-friendly-dropdown .ant-select-item {
            padding: 12px 16px !important;
            min-height: 44px !important;
          }
          .mobile-friendly-dropdown .ant-select-item-group {
            padding: 12px 16px !important;
            font-weight: 600;
          }
          @media (max-width: 767px) {
            .mobile-friendly-dropdown {
              max-height: 60vh !important;
            }
            .mobile-friendly-dropdown .rc-virtual-list-holder {
              max-height: 55vh !important;
            }
          }
        `}</style>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <Title className="vendor-hero-title" style={{ color: brandColors.white, fontSize: 26, marginBottom: 12 }}>Join Our Vendor Network</Title>
          <Paragraph className="vendor-hero-subtitle" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>Get connected with Philadelphia landlords who need your services — from repairs and compliance to financial and professional support.</Paragraph>
        </div>
      </div>

      <Content className="vendor-content" style={{ padding: '24px 12px' }}>
        <Row gutter={[24, 24]} justify="center" style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Benefits Column - Hidden on mobile */}
          <Col xs={0} lg={8}>
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
              className="vendor-form-card"
              style={{
                borderRadius: 16,
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
                border: `1px solid ${brandColors.border}`,
                padding: 8
              }}
              styles={{ body: { padding: '16px 12px' } }}
            >
              {/* Progress Steps - Clickable */}
              <Steps
                className="vendor-steps"
                current={currentStep}
                onChange={handleStepClick}
                items={STEPS.map((step, index) => ({
                  title: step.title,
                  style: { cursor: 'pointer' },
                  status: index < currentStep ? 'finish' : index === currentStep ? 'process' : 'wait'
                }))}
                size="small"
                style={{ marginBottom: 24 }}
              />

              <Form form={form} layout="vertical" onFinish={onFinish} preserve={true}>
                {renderAllSteps()}

                {/* Navigation Buttons */}
                <Divider />
                <Row gutter={[16, 12]}>
                  {currentStep > 0 && (
                    <Col xs={24} md={8}>
                      <Button
                        size="large"
                        block
                        onClick={handleBack}
                        icon={<ArrowLeftOutlined />}
                      >
                        Back
                      </Button>
                    </Col>
                  )}
                  <Col xs={24} md={currentStep > 0 ? 16 : 24}>
                    {currentStep < STEPS.length - 1 ? (
                      <Button
                        type="primary"
                        size="large"
                        block
                        onClick={handleNext}
                        icon={<ArrowRightOutlined />}
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        size="large"
                        block
                        icon={<SendOutlined />}
                      >
                        Submit Application
                      </Button>
                    )}
                  </Col>
                </Row>
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

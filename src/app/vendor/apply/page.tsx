'use client';

import { useState } from 'react';
import {
  Layout,
  Card,
  Form,
  Input,
  Select,
  Button,
  Checkbox,
  Typography,
  Space,
  Row,
  Col,
  Divider,
  message,
  Result,
} from 'antd';
import { HomeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getServiceCategoryOptions } from '@/types/database';
import Link from 'next/link';

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function VendorApplyPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const serviceOptions = getServiceCategoryOptions();

  const onFinish = async (values: Record<string, unknown>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/vendor/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit application');
      }

      setSubmitted(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <a href="https://www.reallandlording.com" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HomeOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Title level={4} style={{ margin: 0 }}>Real Landlording</Title>
          </a>
        </Header>
        <Content style={{ padding: '48px 24px', display: 'flex', justifyContent: 'center' }}>
          <Result
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            title="Application Submitted!"
            subTitle="Thank you for applying to join our vendor network. We'll review your application and get back to you within 2-3 business days."
            extra={[
              <a href="https://www.reallandlording.com" key="home">
                <Button type="primary" size="large">
                  Back to Home
                </Button>
              </a>,
            ]}
          />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <a href="https://www.reallandlording.com" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <HomeOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0 }}>Real Landlording</Title>
        </a>
      </Header>

      <Content style={{ padding: '48px 24px' }}>
        <Row justify="center">
          <Col xs={24} lg={16} xl={14}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <Title level={2}>Join Our Vendor Network</Title>
              <Paragraph style={{ fontSize: 16, color: '#666' }}>
                Get connected with Philadelphia landlords who need your services.
                No marketing spend — we bring qualified leads directly to you.
              </Paragraph>
            </div>

            <Card>
              <Form form={form} layout="vertical" onFinish={onFinish}>
                <Title level={4}>Contact Information</Title>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="contact_name"
                      label="Your Name"
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <Input placeholder="John Smith" size="large" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="business_name"
                      label="Business Name"
                      rules={[{ required: true, message: 'Required' }]}
                    >
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
                        { type: 'email', message: 'Invalid email' },
                      ]}
                    >
                      <Input placeholder="john@smithplumbing.com" size="large" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="phone"
                      label="Phone"
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <Input placeholder="(215) 555-0123" size="large" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="website" label="Website (optional)">
                  <Input placeholder="https://smithplumbing.com" size="large" />
                </Form.Item>

                <Divider />
                <Title level={4}>Services & Coverage</Title>

                <Form.Item
                  name="services"
                  label="Services You Offer"
                  rules={[{ required: true, message: 'Select at least one service' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Select all services you provide"
                    options={serviceOptions}
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  name="service_areas"
                  label="Service Areas (Zip Codes)"
                  rules={[{ required: true, message: 'Enter at least one zip code' }]}
                  extra="Enter the Philadelphia area zip codes you serve"
                >
                  <Select
                    mode="tags"
                    placeholder="19103, 19104, 19106..."
                    tokenSeparators={[',', ' ']}
                    size="large"
                  />
                </Form.Item>

                <Form.Item name="location" label="Business Location">
                  <Input placeholder="Philadelphia, PA" size="large" />
                </Form.Item>

                <Divider />
                <Title level={4}>Qualifications</Title>

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

                <Form.Item
                  name="qualifications"
                  label="Tell us about your experience"
                  rules={[{ required: true, message: 'Please describe your experience' }]}
                >
                  <TextArea
                    rows={4}
                    placeholder="Years in business, certifications, specialties, notable projects..."
                    size="large"
                  />
                </Form.Item>

                <Form.Item name="call_preferences" label="Best way to reach you">
                  <Input placeholder="Call or text anytime, email preferred, etc." size="large" />
                </Form.Item>

                <Divider />

                <Form.Item
                  name="terms_accepted"
                  valuePropName="checked"
                  rules={[
                    {
                      validator: (_, value) =>
                        value ? Promise.resolve() : Promise.reject('You must accept the terms'),
                    },
                  ]}
                >
                  <Checkbox>
                    I agree to respond to referrals within 24 hours and maintain professional
                    service standards. I understand Real Landlording may charge referral fees
                    for successful jobs.
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
                Already a vendor? <Link href="/vendor/login">Sign in to your dashboard</Link>
              </Text>
            </div>
          </Col>
        </Row>
      </Content>

      <Footer style={{ textAlign: 'center', background: '#fafafa' }}>
        Real Landlording © {new Date().getFullYear()} - Philadelphia&apos;s Landlord Community
      </Footer>
    </Layout>
  );
}

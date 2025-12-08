'use client';

import { useState } from 'react';
import { Typography, Row, Col, Layout, Space } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import ServiceRequestForm from '@/components/forms/ServiceRequestForm';
import SignupNudge from '@/components/SignupNudge';
import Link from 'next/link';

const { Title, Text, Paragraph } = Typography;
const { Header, Content, Footer } = Layout;

export default function ServiceRequestPage() {
  const [showSignupNudge, setShowSignupNudge] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submittedRequestId, setSubmittedRequestId] = useState('');

  const handleFormSuccess = (requestId: string, email: string) => {
    setSubmittedRequestId(requestId);
    setSubmittedEmail(email);
    setShowSignupNudge(true);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <a href="https://www.reallandlording.com" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <HomeOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0 }}>
            Real Landlording
          </Title>
        </a>
        <Space>
          <Link href="/auth/login">
            <Text style={{ color: '#1890ff' }}>Sign In</Text>
          </Link>
        </Space>
      </Header>

      <Content style={{ padding: '48px 24px' }}>
        <Row gutter={[48, 48]} justify="center">
          {/* Hero Section */}
          <Col xs={24} lg={10}>
            <div style={{ maxWidth: 500 }}>
              <Title level={1}>
                Find Vetted Vendors for Your Rental Properties
              </Title>
              <Paragraph style={{ fontSize: 18, color: '#666' }}>
                We connect Philadelphia landlords with reliable, pre-screened service providers.
                Submit a request and we&apos;ll match you with up to 3 qualified vendors.
              </Paragraph>
              <Space direction="vertical" size="small" style={{ marginTop: 24 }}>
                <Text strong>Why landlords choose us:</Text>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  <li>All vendors are vetted for rental property experience</li>
                  <li>Free to submit requests</li>
                  <li>Get matched within 24-48 hours</li>
                  <li>2,900+ landlords in our community</li>
                </ul>
              </Space>
            </div>
          </Col>

          {/* Form Section */}
          <Col xs={24} lg={14} xl={12}>
            <ServiceRequestForm onSuccess={handleFormSuccess} />
          </Col>
        </Row>
      </Content>

      <Footer style={{ textAlign: 'center', background: '#fafafa' }}>
        Real Landlording &copy; {new Date().getFullYear()} - Philadelphia&apos;s Landlord Community
      </Footer>

      <SignupNudge
        open={showSignupNudge}
        email={submittedEmail}
        requestId={submittedRequestId}
        onClose={() => setShowSignupNudge(false)}
      />
    </Layout>
  );
}

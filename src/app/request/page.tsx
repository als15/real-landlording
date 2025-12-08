'use client';

import { useState } from 'react';
import { Typography, Row, Col, Layout, Space } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  StarFilled,
} from '@ant-design/icons';
import MultiStepServiceRequestForm from '@/components/forms/MultiStepServiceRequestForm';
import SignupNudge from '@/components/SignupNudge';
import FAQ from '@/components/FAQ';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { brandColors } from '@/theme/config';

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;

const trustSignals = [
  {
    icon: <ClockCircleOutlined style={{ fontSize: 28 }} />,
    title: '24-48 Hour Response',
    description: 'Get matched with vendors quickly',
    color: brandColors.accent,
  },
  {
    icon: <SafetyCertificateOutlined style={{ fontSize: 28 }} />,
    title: 'Vetted Vendors',
    description: 'All contractors checked for rental experience',
    color: '#52c41a',
  },
  {
    icon: <CheckCircleOutlined style={{ fontSize: 28 }} />,
    title: 'No Membership Required',
    description: 'Free to submit requests',
    color: '#722ed1',
  },
  {
    icon: <TeamOutlined style={{ fontSize: 28 }} />,
    title: '2,900+ Landlords',
    description: 'Join Philadelphia\'s trusted community',
    color: brandColors.accent,
  },
];

const stats = [
  { value: '800+', label: 'Referrals Made' },
  { value: '2,900+', label: 'Landlords Served' },
  { value: '100+', label: 'Vetted Vendors' },
];

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
    <Layout style={{ minHeight: '100vh', background: brandColors.background }}>
      <PublicHeader showRequestButton={false} />

      {/* Hero Section */}
      <div
        style={{
          background: `linear-gradient(135deg, ${brandColors.backgroundDark} 0%, #23282d 100%)`,
          padding: '64px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(212, 168, 71, 0.15)',
              padding: '8px 16px',
              borderRadius: 20,
              marginBottom: 24,
            }}
          >
            <StarFilled style={{ color: brandColors.accent }} />
            <Text style={{ color: brandColors.accent, fontWeight: 500 }}>
              Trusted by 2,900+ Philadelphia Landlords
            </Text>
          </div>
          <Title
            style={{
              color: brandColors.white,
              fontSize: 42,
              marginBottom: 16,
              fontWeight: 600,
            }}
          >
            Get Matched with Trusted
            <br />
            Philadelphia Contractors
          </Title>
          <Paragraph
            style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: 18,
              marginBottom: 32,
              maxWidth: 600,
              margin: '0 auto',
            }}
          >
            Tell us about your project and we&apos;ll connect you with vetted vendors
            who specialize in rental properties.
          </Paragraph>

          {/* Stats */}
          <Row gutter={32} justify="center" style={{ marginTop: 40 }}>
            {stats.map((stat, index) => (
              <Col key={index}>
                <div style={{ textAlign: 'center' }}>
                  <Text
                    style={{
                      color: brandColors.accent,
                      fontSize: 32,
                      fontWeight: 700,
                      display: 'block',
                    }}
                  >
                    {stat.value}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
                    {stat.label}
                  </Text>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      <Content style={{ padding: '64px 24px' }}>
        <Row gutter={[64, 48]} justify="center" style={{ maxWidth: 1400, margin: '0 auto' }}>
          {/* Left Column - Trust Signals */}
          <Col xs={24} lg={8}>
            <div style={{ position: 'sticky', top: 100 }}>
              <Title level={3} style={{ marginBottom: 8, color: brandColors.primary }}>
                Why Landlords Trust Us
              </Title>
              <Paragraph style={{ color: brandColors.textSecondary, marginBottom: 32 }}>
                We&apos;ve helped hundreds of Philadelphia landlords find reliable contractors for their rental properties.
              </Paragraph>

              {/* Trust Signals */}
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {trustSignals.map((signal, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 16,
                      padding: 20,
                      background: brandColors.white,
                      borderRadius: 12,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      border: `1px solid ${brandColors.border}`,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        background: `${signal.color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: signal.color,
                        flexShrink: 0,
                      }}
                    >
                      {signal.icon}
                    </div>
                    <div>
                      <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>
                        {signal.title}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 14 }}>
                        {signal.description}
                      </Text>
                    </div>
                  </div>
                ))}
              </Space>

              {/* Testimonial */}
              <div
                style={{
                  marginTop: 32,
                  padding: 24,
                  background: `linear-gradient(135deg, ${brandColors.primary} 0%, #23282d 100%)`,
                  borderRadius: 12,
                }}
              >
                <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarFilled key={star} style={{ color: brandColors.accent, fontSize: 16 }} />
                  ))}
                </div>
                <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, marginBottom: 16, fontStyle: 'italic' }}>
                  &ldquo;Real Landlording connected me with an amazing plumber within hours.
                  They understood the urgency of a rental emergency.&rdquo;
                </Paragraph>
                <Text style={{ color: brandColors.accent, fontWeight: 500 }}>
                  — Mike T., Fishtown Landlord
                </Text>
              </div>
            </div>
          </Col>

          {/* Right Column - Form */}
          <Col xs={24} lg={14} xl={12}>
            <div
              style={{
                background: brandColors.white,
                borderRadius: 16,
                padding: 32,
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
                border: `1px solid ${brandColors.border}`,
              }}
            >
              <Title level={3} style={{ marginBottom: 8, color: brandColors.primary }}>
                Submit Your Request
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 24 }}>
                Fill out the form below and we&apos;ll match you with up to 3 qualified vendors.
              </Paragraph>
              <MultiStepServiceRequestForm onSuccess={handleFormSuccess} />
            </div>

            {/* FAQ Section */}
            <div style={{ marginTop: 48 }}>
              <FAQ />
            </div>
          </Col>
        </Row>
      </Content>

      <PublicFooter />

      <SignupNudge
        open={showSignupNudge}
        email={submittedEmail}
        requestId={submittedRequestId}
        onClose={() => setShowSignupNudge(false)}
      />
    </Layout>
  );
}

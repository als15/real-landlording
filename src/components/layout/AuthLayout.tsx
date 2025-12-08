'use client';

import { Layout, Typography, Row, Col } from 'antd';
import { StarFilled } from '@ant-design/icons';
import Link from 'next/link';
import { brandColors } from '@/theme/config';

const { Content } = Layout;
const { Text, Title, Paragraph } = Typography;

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

const features = [
  'Get matched with vetted contractors',
  'Track all your service requests',
  'Leave reviews and build relationships',
  'Access exclusive landlord resources',
];

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Row style={{ minHeight: '100vh' }}>
        {/* Left Panel - Branding */}
        <Col
          xs={0}
          md={10}
          lg={12}
          style={{
            background: `linear-gradient(135deg, ${brandColors.backgroundDark} 0%, #1d2124 100%)`,
            padding: 48,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <Link href="https://www.reallandlording.com" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  background: `linear-gradient(135deg, ${brandColors.accent} 0%, #c49a3d 100%)`,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 18,
                  color: brandColors.backgroundDark,
                }}
              >
                RL
              </div>
              <div>
                <Text strong style={{ color: brandColors.white, fontSize: 18, display: 'block' }}>
                  Real Landlording
                </Text>
                <Text style={{ color: brandColors.accent, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ProLink Services
                </Text>
              </div>
            </div>
          </Link>

          {/* Middle Content */}
          <div style={{ maxWidth: 400 }}>
            <Title level={2} style={{ color: brandColors.white, marginBottom: 16 }}>
              Philadelphia&apos;s Trusted Landlord Community
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, marginBottom: 32 }}>
              Join 2,900+ landlords who use Real Landlording to find reliable contractors for their rental properties.
            </Paragraph>

            {/* Features List */}
            <div style={{ marginTop: 32 }}>
              {features.map((feature, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      background: `${brandColors.accent}20`,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <StarFilled style={{ color: brandColors.accent, fontSize: 12 }} />
                  </div>
                  <Text style={{ color: 'rgba(255,255,255,0.9)' }}>{feature}</Text>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              padding: 24,
              borderRadius: 12,
              borderLeft: `3px solid ${brandColors.accent}`,
            }}
          >
            <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, marginBottom: 12, fontStyle: 'italic' }}>
              &ldquo;Real Landlording has been invaluable for managing my properties. The vendor network saved me countless hours.&rdquo;
            </Paragraph>
            <Text style={{ color: brandColors.accent, fontWeight: 500 }}>
              — Sarah K., 12-unit Portfolio
            </Text>
          </div>
        </Col>

        {/* Right Panel - Form */}
        <Col
          xs={24}
          md={14}
          lg={12}
          style={{
            background: brandColors.background,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Content style={{ width: '100%', maxWidth: 420 }}>
            {/* Mobile Logo */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: 32,
              }}
              className="md-hidden"
            >
              <Link href="https://www.reallandlording.com" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      background: `linear-gradient(135deg, ${brandColors.accent} 0%, #c49a3d 100%)`,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 16,
                      color: brandColors.backgroundDark,
                    }}
                  >
                    RL
                  </div>
                  <Text strong style={{ color: brandColors.primary, fontSize: 16 }}>
                    Real Landlording
                  </Text>
                </div>
              </Link>
            </div>

            {/* Form Card */}
            <div
              style={{
                background: brandColors.white,
                padding: 32,
                borderRadius: 16,
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
                border: `1px solid ${brandColors.border}`,
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <Title level={3} style={{ marginBottom: 8, color: brandColors.primary }}>
                  {title}
                </Title>
                <Text type="secondary">{subtitle}</Text>
              </div>

              {children}
            </div>

            {/* Back to home */}
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <a
                href="https://www.reallandlording.com"
                style={{ color: brandColors.textSecondary }}
              >
                ← Back to Real Landlording
              </a>
            </div>
          </Content>
        </Col>
      </Row>
    </Layout>
  );
}

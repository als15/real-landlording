'use client';

import { Layout, Typography, Space, Row, Col } from 'antd';
import {
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { brandColors } from '@/theme/config';

const { Footer } = Layout;
const { Text, Title } = Typography;

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <Footer
      style={{
        background: brandColors.backgroundDark,
        padding: '48px 24px 24px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Row gutter={[48, 32]}>
          {/* Brand Column */}
          <Col xs={24} sm={12} md={8}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  background: `linear-gradient(135deg, ${brandColors.accent} 0%, #c49a3d 100%)`,
                  borderRadius: 8,
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
              <Title level={5} style={{ margin: 0, color: brandColors.white }}>
                Real Landlording
              </Title>
            </div>
            <Text style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: 16 }}>
              Philadelphia&apos;s trusted community connecting landlords with vetted contractors since 2019.
            </Text>
            <Space direction="vertical" size={4}>
              <Space>
                <EnvironmentOutlined style={{ color: brandColors.accent }} />
                <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Philadelphia, PA</Text>
              </Space>
              <Space>
                <MailOutlined style={{ color: brandColors.accent }} />
                <a href="mailto:hello@reallandlording.com" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  hello@reallandlording.com
                </a>
              </Space>
            </Space>
          </Col>

          {/* Quick Links */}
          <Col xs={24} sm={12} md={8}>
            <Title level={5} style={{ color: brandColors.accent, marginBottom: 16 }}>
              Quick Links
            </Title>
            <Space direction="vertical" size={8}>
              <a href="https://www.reallandlording.com/prolink/" style={{ color: 'rgba(255,255,255,0.7)' }}>
                ProLink Services
              </a>
              <Link href="/request" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Submit a Request
              </Link>
              <Link href="/vendor/apply" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Become a Vendor
              </Link>
              <a href="https://www.reallandlording.com/articles/" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Resources & Articles
              </a>
              <a href="https://www.reallandlording.com/contact/" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Contact Us
              </a>
            </Space>
          </Col>

          {/* For Landlords */}
          <Col xs={24} sm={12} md={8}>
            <Title level={5} style={{ color: brandColors.accent, marginBottom: 16 }}>
              For Landlords
            </Title>
            <Space direction="vertical" size={8}>
              <Link href="/auth/login" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Landlord Portal
              </Link>
              <Link href="/auth/signup" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Create Account
              </Link>
              <a href="https://www.reallandlording.com/community/" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Join the Community
              </a>
            </Space>
          </Col>
        </Row>

        {/* Bottom Bar */}
        <div
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.5)' }}>
            &copy; {currentYear} Real Landlording. All rights reserved.
          </Text>
          <Space split={<Text style={{ color: 'rgba(255,255,255,0.3)' }}>|</Text>}>
            <a href="https://www.reallandlording.com/privacy/" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Privacy Policy
            </a>
            <a href="https://www.reallandlording.com/terms/" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Terms of Service
            </a>
          </Space>
        </div>
      </div>
    </Footer>
  );
}

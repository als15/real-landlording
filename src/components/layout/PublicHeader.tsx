'use client';

import { Layout, Typography, Space, Button } from 'antd';
import { UserOutlined, FormOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { brandColors } from '@/theme/config';

const { Header } = Layout;
const { Text } = Typography;

interface PublicHeaderProps {
  showRequestButton?: boolean;
  showSignIn?: boolean;
}

export default function PublicHeader({
  showRequestButton = true,
  showSignIn = true
}: PublicHeaderProps) {
  return (
    <Header
      style={{
        background: brandColors.backgroundDark,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      }}
    >
      <a
        href="https://www.reallandlording.com"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          textDecoration: 'none',
        }}
      >
        {/* Logo mark */}
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
            fontSize: 18,
            color: brandColors.backgroundDark,
          }}
        >
          RL
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <Text
            strong
            style={{
              color: brandColors.white,
              fontSize: 16,
              letterSpacing: '-0.02em',
            }}
          >
            Real Landlording
          </Text>
          <Text
            style={{
              color: brandColors.accent,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            ProLink Services
          </Text>
        </div>
      </a>

      <Space size="middle">
        {showRequestButton && (
          <Link href="/request">
            <Button
              type="primary"
              icon={<FormOutlined />}
              style={{
                background: brandColors.accent,
                borderColor: brandColors.accent,
                color: brandColors.backgroundDark,
                fontWeight: 500,
              }}
            >
              Submit Request
            </Button>
          </Link>
        )}
        {showSignIn && (
          <Link href="/auth/login">
            <Button
              type="text"
              icon={<UserOutlined />}
              style={{
                color: brandColors.white,
              }}
            >
              Sign In
            </Button>
          </Link>
        )}
      </Space>
    </Header>
  );
}

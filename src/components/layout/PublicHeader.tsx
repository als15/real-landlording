'use client';

import { useEffect, useState } from 'react';
import { Layout, Typography, Space, Button, Avatar, Dropdown } from 'antd';
import { UserOutlined, FormOutlined, DashboardOutlined, LogoutOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { brandColors } from '@/theme/config';
import type { MenuProps } from 'antd';

const { Header } = Layout;
const { Text } = Typography;

interface PublicHeaderProps {
  showRequestButton?: boolean;
  showSignIn?: boolean;
}

interface UserInfo {
  email: string;
  name?: string;
}

export default function PublicHeader({
  showRequestButton = true,
  showSignIn = true
}: PublicHeaderProps) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/landlord/profile');
      if (response.ok) {
        const data = await response.json();
        setUser({ email: data.email, name: data.name || data.first_name });
      }
    } catch {
      // Not logged in, that's fine
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.refresh();
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'My Dashboard',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
    },
  ];

  const handleUserMenuClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'dashboard') {
      router.push('/dashboard');
    } else if (e.key === 'logout') {
      handleLogout();
    }
  };
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
        {!loading && user ? (
          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar
                icon={<UserOutlined />}
                style={{ backgroundColor: brandColors.accent, color: brandColors.backgroundDark }}
              />
              <Text style={{ color: brandColors.white, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name || user.email.split('@')[0]}
              </Text>
            </Space>
          </Dropdown>
        ) : showSignIn && !loading ? (
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
        ) : null}
      </Space>
    </Header>
  );
}

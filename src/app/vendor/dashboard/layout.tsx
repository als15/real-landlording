'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Layout, Menu, Typography, Space, Dropdown, Avatar } from 'antd';
import {
  FileTextOutlined,
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import Link from 'next/link';
import { brandColors } from '@/theme/config';
import VendorNotificationBell from '@/components/vendor/VendorNotificationBell';
import ThemeToggle from '@/components/ThemeToggle';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

function getSelectedKey(pathname: string): string[] {
  if (pathname.startsWith('/vendor/dashboard/jobs')) return ['jobs'];
  if (pathname.startsWith('/vendor/dashboard/profile')) return ['profile'];
  if (pathname === '/vendor/dashboard') return ['dashboard'];
  return [];
}

export default function VendorDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('https://www.reallandlording.com');
    router.refresh();
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'My Profile',
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
    if (e.key === 'logout') {
      handleLogout();
    } else if (e.key === 'profile') {
      router.push('/vendor/dashboard/profile');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: brandColors.background }}>
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
        <Space size="large">
          <a
            href="https://www.reallandlording.com"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/rl-logo.svg" alt="Real Landlording" style={{ height: 40, width: 'auto', filter: 'brightness(0) invert(1)' }} />
            <Text style={{ color: brandColors.accent, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: -4 }}>
              Vendor Portal
            </Text>
          </a>
          <Menu
            mode="horizontal"
            selectedKeys={getSelectedKey(pathname)}
            style={{
              background: 'transparent',
              border: 'none',
            }}
            theme="dark"
            items={[
              {
                key: 'dashboard',
                icon: <DashboardOutlined />,
                label: <Link href="/vendor/dashboard">Dashboard</Link>,
              },
              {
                key: 'jobs',
                icon: <FileTextOutlined />,
                label: <Link href="/vendor/dashboard/jobs">My Jobs</Link>,
              },
              {
                key: 'profile',
                icon: <UserOutlined />,
                label: <Link href="/vendor/dashboard/profile">Profile</Link>,
              },
            ]}
          />
        </Space>

        <Space size="middle">
          <ThemeToggle size="middle" />
          <VendorNotificationBell />
          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar
                style={{
                  background: `linear-gradient(135deg, ${brandColors.accent} 0%, #c49a3d 100%)`,
                  color: brandColors.backgroundDark,
                }}
              >
                V
              </Avatar>
              <Text style={{ color: brandColors.textOnDark }}>Vendor Portal</Text>
            </Space>
          </Dropdown>
        </Space>
      </Header>

      <Content style={{ padding: '24px 48px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {children}
      </Content>

      <Footer
        style={{
          textAlign: 'center',
          background: brandColors.backgroundDark,
          color: 'rgba(255,255,255,0.6)',
          padding: '16px 24px',
        }}
      >
        Real Landlording &copy; {new Date().getFullYear()} - Vendor Portal
      </Footer>
    </Layout>
  );
}

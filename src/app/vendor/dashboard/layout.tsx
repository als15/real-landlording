'use client';

import { useRouter } from 'next/navigation';
import { Layout, Menu, Typography, Space, Dropdown, Avatar } from 'antd';
import {
  FileTextOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import Link from 'next/link';
import { brandColors } from '@/theme/config';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

export default function VendorDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

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
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
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
            <div
              style={{
                width: 32,
                height: 32,
                background: `linear-gradient(135deg, ${brandColors.accent} 0%, #c49a3d 100%)`,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
                color: brandColors.backgroundDark,
              }}
            >
              RL
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <Text strong style={{ color: brandColors.white, fontSize: 14, display: 'block' }}>
                Real Landlording
              </Text>
              <Text style={{ color: brandColors.accent, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Vendor Portal
              </Text>
            </div>
          </a>
          <Menu
            mode="horizontal"
            selectedKeys={[]}
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
                label: <Link href="/vendor/dashboard">My Jobs</Link>,
              },
            ]}
          />
        </Space>

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
            <Text style={{ color: brandColors.white }}>Vendor Portal</Text>
          </Space>
        </Dropdown>
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

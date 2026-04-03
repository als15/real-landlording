'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Layout, Menu, Button, Space, Dropdown, Avatar } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  HeartOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import Link from 'next/link';
import { brandColors } from '@/theme/config';
import NotificationBell from '@/components/dashboard/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';

const { Header, Content, Footer } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('https://www.reallandlording.com');
    router.refresh();
  };

  // Map pathname to selected menu key
  const getSelectedKey = () => {
    if (pathname === '/dashboard') return 'dashboard';
    if (pathname.startsWith('/dashboard/requests')) return 'requests';
    if (pathname.startsWith('/dashboard/vendors')) return 'vendors';
    return 'dashboard';
  };

  const navItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link href="/dashboard">Dashboard</Link>,
    },
    {
      key: 'requests',
      icon: <FileTextOutlined />,
      label: <Link href="/dashboard/requests">My Requests</Link>,
    },
    {
      key: 'vendors',
      icon: <HeartOutlined />,
      label: <Link href="/dashboard/vendors">Saved Vendors</Link>,
    },
  ];

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
    switch (e.key) {
      case 'profile':
        router.push('/dashboard/profile');
        break;
      case 'settings':
        router.push('/dashboard/settings');
        break;
      case 'logout':
        handleLogout();
        break;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: brandColors.white,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${brandColors.border}`,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: 70,
        }}
      >
        <Space size="large">
          <a href="https://www.reallandlording.com" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/rl-logo.svg" alt="Real Landlording" style={{ height: 45, width: 'auto' }} />
          </a>
          <Menu
            mode="horizontal"
            selectedKeys={[getSelectedKey()]}
            style={{ border: 'none', lineHeight: '68px' }}
            items={navItems}
          />
        </Space>

        <Space>
          <Link href="/request">
            <Button type="primary" icon={<PlusOutlined />}>
              New Request
            </Button>
          </Link>
          <ThemeToggle size="middle" />
          <NotificationBell />
          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
            </Space>
          </Dropdown>
        </Space>
      </Header>

      <Content style={{ padding: '24px 48px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {children}
      </Content>

      <Footer style={{ textAlign: 'center', background: '#fafafa' }}>
        Real Landlording © {new Date().getFullYear()} - Philadelphia&apos;s Landlord Community
      </Footer>
    </Layout>
  );
}

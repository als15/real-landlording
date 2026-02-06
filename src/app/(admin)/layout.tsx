'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Layout, Menu, Typography, Button, Space, Dropdown, Avatar } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  TeamOutlined,
  UserOutlined,
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  SettingOutlined,
  SolutionOutlined,
  MailOutlined,
  FundOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { brandColors } from '@/theme/config';
import { NotificationDropdown } from '@/components/admin/notifications';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const menuItems: MenuProps['items'] = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
  },
  {
    key: '/requests',
    icon: <FileTextOutlined />,
    label: 'Requests',
  },
  {
    key: '/vendors',
    icon: <TeamOutlined />,
    label: 'Vendors',
  },
  {
    key: '/applications',
    icon: <SolutionOutlined />,
    label: 'Applications',
  },
  {
    key: '/landlords',
    icon: <UserOutlined />,
    label: 'Landlords',
  },
  {
    type: 'divider',
    style: { margin: '12px 16px', borderColor: 'rgba(255,255,255,0.1)' },
  },
  {
    key: 'operations',
    icon: <BarChartOutlined />,
    label: 'Operations',
    children: [
      {
        key: '/crm',
        icon: <FundOutlined />,
        label: 'CRM',
      },
      {
        key: '/analytics',
        icon: <BarChartOutlined />,
        label: 'Analytics',
      },
      {
        key: '/payments',
        icon: <DollarOutlined />,
        label: 'Payments',
      },
      {
        key: '/emails',
        icon: <MailOutlined />,
        label: 'Emails',
      },
    ],
  },
];

// Routes that belong to the Operations submenu
const operationsRoutes = ['/crm', '/analytics', '/payments', '/emails'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Determine which submenu should be open based on current path
  const defaultOpenKeys = operationsRoutes.includes(pathname) ? ['operations'] : [];

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    router.push(e.key);
  };

  const userMenuItems: MenuProps['items'] = [
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

  const handleUserMenuClick: MenuProps['onClick'] = async (e) => {
    if (e.key === 'logout') {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        style={{
          background: brandColors.backgroundDark,
          borderRight: 'none',
        }}
      >
        {/* Logo Section */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {collapsed ? (
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
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/rl-logo.svg" alt="Real Landlording" style={{ height: 32, width: 'auto', filter: 'brightness(0) invert(1)' }} />
              <Text style={{ color: brandColors.accent, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Admin
              </Text>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          defaultOpenKeys={defaultOpenKeys}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            background: 'transparent',
            borderRight: 0,
            marginTop: 8,
          }}
          theme="dark"
        />
        <style jsx global>{`
          .ant-menu-dark .ant-menu-sub {
            background: ${brandColors.backgroundDark} !important;
          }
          .ant-menu-dark.ant-menu-inline .ant-menu-sub.ant-menu-inline {
            background: rgba(255, 255, 255, 0.04) !important;
          }
        `}</style>
      </Sider>

      <Layout style={{ background: brandColors.background }}>
        <Header
          style={{
            padding: '0 24px',
            background: brandColors.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${brandColors.border}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16 }}
          />
          <Space size="middle">
            <NotificationDropdown />
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  style={{
                    background: `linear-gradient(135deg, ${brandColors.accent} 0%, #c49a3d 100%)`,
                    color: brandColors.backgroundDark,
                  }}
                >
                  A
                </Avatar>
                <Text strong>Admin</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content
          style={{
            margin: 24,
            padding: 24,
            background: brandColors.white,
            borderRadius: 12,
            minHeight: 280,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { Layout, Menu, Typography, theme, Button, Space, Dropdown, Avatar } from 'antd';
import {
  HomeOutlined,
  FileTextOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import Link from 'next/link';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token } = theme.useToken();

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
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Space size="large">
          <a href="https://www.reallandlording.com" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HomeOutlined style={{ fontSize: 24, color: token.colorPrimary }} />
            <Title level={4} style={{ margin: 0 }}>Real Landlording</Title>
          </a>
          <Menu
            mode="horizontal"
            selectedKeys={[]}
            style={{ border: 'none' }}
            items={[
              {
                key: 'dashboard',
                icon: <FileTextOutlined />,
                label: <Link href="/dashboard">My Requests</Link>,
              },
            ]}
          />
        </Space>

        <Space>
          <Link href="/request">
            <Button type="primary" icon={<PlusOutlined />}>
              New Request
            </Button>
          </Link>
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

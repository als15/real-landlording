'use client'

import { useEffect, useState } from 'react'
import { Layout, Typography, Space, Button, Avatar, Dropdown } from 'antd'
import { UserOutlined, FormOutlined, DashboardOutlined, LogoutOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { brandColors } from '@/theme/config'
import type { MenuProps } from 'antd'

const { Header } = Layout
const { Text } = Typography

// CSS for responsive header
const headerStyles = `
  .public-header {
    padding: 0 12px !important;
  }
  .public-header .header-btn-text {
    display: none;
  }
  .public-header .header-user-name {
    display: none;
  }
  .public-header .header-btn {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }
  .public-header .header-logo-img {
    height: 32px;
  }
  @media (min-width: 576px) {
    .public-header {
      padding: 0 24px !important;
    }
    .public-header .header-btn-text {
      display: inline;
    }
    .public-header .header-user-name {
      display: inline;
    }
    .public-header .header-btn {
      padding-left: 20px !important;
      padding-right: 20px !important;
    }
    .public-header .header-logo-img {
      height: 42px;
    }
  }
`

interface PublicHeaderProps {
  showRequestButton?: boolean
  showSignIn?: boolean
}

interface UserInfo {
  email: string
  name?: string
}

export default function PublicHeader({ showRequestButton = true, showSignIn = true }: PublicHeaderProps) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/landlord/profile')
      if (response.ok) {
        const data = await response.json()
        setUser({ email: data.email, name: data.name || data.first_name })
      }
    } catch {
      // Not logged in, that's fine
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    router.refresh()
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'My Dashboard'
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true
    }
  ]

  const handleUserMenuClick: MenuProps['onClick'] = e => {
    if (e.key === 'dashboard') {
      router.push('/dashboard')
    } else if (e.key === 'logout') {
      handleLogout()
    }
  }

  return (
    <Header
      className="public-header"
      style={{
        background: brandColors.white,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        borderBottom: `1px solid ${brandColors.border}`,
        height: 64
      }}
    >
      <style>{headerStyles}</style>
      <a
        href="https://www.reallandlording.com"
        className="header-logo"
        style={{
          display: 'flex',
          alignItems: 'center',
          textDecoration: 'none',
          flexShrink: 0
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/rl-logo.svg" alt="Real Landlording" className="header-logo-img" style={{ height: 38, width: 'auto' }} />
      </a>

      <Space size="small">
        {showRequestButton && (
          <Link href="/request">
            <Button
              className="header-btn"
              type="primary"
              icon={<FormOutlined />}
              size="middle"
              style={{
                background: brandColors.primary,
                borderColor: brandColors.primary,
                fontWeight: 500,
                borderRadius: 8,
                height: 40
              }}
            >
              <span className="header-btn-text">Submit Request</span>
            </Button>
          </Link>
        )}
        {!loading && user ? (
          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: brandColors.primary, color: brandColors.white }} size="default" />
              <Text className="header-user-name" style={{ color: brandColors.textPrimary, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || user.email.split('@')[0]}</Text>
            </Space>
          </Dropdown>
        ) : showSignIn && !loading ? (
          <Link href="/auth/login">
            <Button
              className="header-btn"
              type="default"
              icon={<UserOutlined />}
              size="middle"
              style={{
                borderColor: brandColors.primary,
                color: brandColors.primary,
                fontWeight: 500,
                borderRadius: 8,
                height: 40
              }}
            >
              <span className="header-btn-text">Sign In</span>
            </Button>
          </Link>
        ) : null}
      </Space>
    </Header>
  )
}

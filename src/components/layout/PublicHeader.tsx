'use client'

import { useEffect, useState } from 'react'
import { Layout, Typography, Space, Button, Avatar, Dropdown } from 'antd'
import { UserOutlined, FormOutlined, DashboardOutlined, LogoutOutlined } from '@ant-design/icons'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { brandColors } from '@/theme/config'
import type { MenuProps } from 'antd'

const { Header } = Layout
const { Text } = Typography

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
        height: 70
      }}
    >
      <a
        href="https://www.reallandlording.com"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          textDecoration: 'none'
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/rl-logo.svg" alt="Real Landlording" style={{ height: 45, width: 'auto' }} />
      </a>

      <Space size="middle">
        {showRequestButton && (
          <Link href="/request">
            <Button
              type="primary"
              icon={<FormOutlined />}
              size="large"
              style={{
                background: brandColors.primary,
                borderColor: brandColors.primary,
                fontWeight: 500,
                borderRadius: 8,
                height: 44,
                paddingLeft: 20,
                paddingRight: 20
              }}
            >
              Submit Request
            </Button>
          </Link>
        )}
        {!loading && user ? (
          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: brandColors.primary, color: brandColors.white }} />
              <Text style={{ color: brandColors.textPrimary, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name || user.email.split('@')[0]}</Text>
            </Space>
          </Dropdown>
        ) : showSignIn && !loading ? (
          <Link href="/auth/login">
            <Button
              type="default"
              icon={<UserOutlined />}
              size="large"
              style={{
                borderColor: brandColors.primary,
                color: brandColors.primary,
                fontWeight: 500,
                borderRadius: 8,
                height: 44
              }}
            >
              Sign In
            </Button>
          </Link>
        ) : null}
      </Space>
    </Header>
  )
}

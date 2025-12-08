'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Form, Input, Button, Typography, App, Space, Divider, Spin } from 'antd';
import { LockOutlined, MailOutlined, HomeOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Text } = Typography;

function VendorLoginForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/vendor/dashboard';
  const error = searchParams.get('error');
  const { message } = App.useApp();

  // Show error messages from redirects
  useEffect(() => {
    if (error === 'not_vendor') {
      message.error('You need a vendor account to access that page. Apply to join our network.');
    } else if (error === 'vendor_not_active') {
      message.warning('Your vendor account is pending approval. We\'ll notify you once approved.');
    }
  }, [error, message]);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/vendor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      message.success('Login successful');
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        padding: 24,
      }}
    >
      <Card style={{ width: 400, maxWidth: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <HomeOutlined style={{ fontSize: 40, color: '#1890ff' }} />
          <Title level={3} style={{ marginTop: 16, marginBottom: 8 }}>
            Vendor Portal
          </Title>
          <Text type="secondary">Sign in to manage your jobs</Text>
        </div>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Email"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <div style={{ textAlign: 'right', marginBottom: 16 }}>
            <Link href="/auth/forgot-password?type=vendor">Forgot Password?</Link>
          </div>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <Divider>
          <Text type="secondary">Not a vendor yet?</Text>
        </Divider>

        <Space direction="vertical" style={{ width: '100%' }}>
          <Link href="/vendor/apply">
            <Button block size="large">
              Apply to Join
            </Button>
          </Link>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <a href="https://www.reallandlording.com">← Back to Home</a>
          </div>
        </Space>
      </Card>
    </div>
  );
}

export default function VendorLoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    }>
      <VendorLoginForm />
    </Suspense>
  );
}

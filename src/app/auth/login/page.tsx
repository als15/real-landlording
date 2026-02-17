'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form, Input, Button, Typography, App, Divider, Spin } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import Link from 'next/link';
import AuthLayout from '@/components/layout/AuthLayout';
import { brandColors } from '@/theme/config';
import { sanitizeRedirectUrl } from '@/lib/security';

const { Text } = Typography;

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = sanitizeRedirectUrl(searchParams.get('redirectTo'));
  const error = searchParams.get('error');
  const { message } = App.useApp();

  useEffect(() => {
    if (error === 'not_landlord') {
      message.error('You need a landlord account to access that page. Please sign up first.');
    }
  }, [error, message]);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/landlord/login', {
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
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your landlord account"
    >
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="email"
          rules={[
            { required: true, message: 'Please enter your email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input
            prefix={<MailOutlined style={{ color: brandColors.textLight }} />}
            placeholder="Email"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Please enter your password' }]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: brandColors.textLight }} />}
            placeholder="Password"
            size="large"
          />
        </Form.Item>

        <div style={{ textAlign: 'right', marginBottom: 16 }}>
          <Link href="/auth/forgot-password?type=landlord" style={{ color: brandColors.accent }}>
            Forgot Password?
          </Link>
        </div>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            Sign In
          </Button>
        </Form.Item>
      </Form>

      <Divider>
        <Text type="secondary" style={{ fontSize: 13 }}>New to Real Landlording?</Text>
      </Divider>

      <Link href="/auth/signup">
        <Button block size="large">
          Create an Account
        </Button>
      </Link>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

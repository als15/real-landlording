'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Typography, message, Divider } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import Link from 'next/link';
import AuthLayout from '@/components/layout/AuthLayout';
import { brandColors } from '@/theme/config';

const { Text } = Typography;

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onFinish = async (values: { email: string; password: string; name: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      message.success('Account created! Please check your email to verify.');
      router.push('/auth/login');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join our community of Philadelphia landlords"
    >
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="name"
          rules={[{ required: true, message: 'Please enter your name' }]}
        >
          <Input
            prefix={<UserOutlined style={{ color: brandColors.textLight }} />}
            placeholder="Full Name"
            size="large"
          />
        </Form.Item>

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
          rules={[
            { required: true, message: 'Please create a password' },
            { min: 8, message: 'Password must be at least 8 characters' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: brandColors.textLight }} />}
            placeholder="Password (min 8 characters)"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Please confirm your password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: brandColors.textLight }} />}
            placeholder="Confirm Password"
            size="large"
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            Create Account
          </Button>
        </Form.Item>
      </Form>

      <Divider>
        <Text type="secondary" style={{ fontSize: 13 }}>Already have an account?</Text>
      </Divider>

      <Link href="/auth/login">
        <Button block size="large">
          Sign In
        </Button>
      </Link>
    </AuthLayout>
  );
}

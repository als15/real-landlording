'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Typography, App, Divider, Result, Alert } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined, CheckCircleOutlined } from '@ant-design/icons';
import Link from 'next/link';
import AuthLayout from '@/components/layout/AuthLayout';
import { brandColors } from '@/theme/config';

const { Text } = Typography;

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(true);
  const router = useRouter();
  const { message } = App.useApp();

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

      setUserEmail(values.email);
      setNeedsEmailConfirmation(data.needsEmailConfirmation);

      if (data.needsEmailConfirmation) {
        // Show confirmation screen
        setSignupComplete(true);
      } else {
        // Email confirmation disabled, go directly to login
        message.success('Account created! You can now sign in.');
        router.push('/auth/login');
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (signupComplete) {
    return (
      <AuthLayout
        title="Check Your Email"
        subtitle="Almost there!"
      >
        <Result
          icon={<CheckCircleOutlined style={{ color: brandColors.success }} />}
          title="Account Created!"
          subTitle={
            <div style={{ textAlign: 'left', maxWidth: 350, margin: '0 auto' }}>
              <p style={{ marginBottom: 16 }}>
                We sent a verification link to:
              </p>
              <p style={{ fontWeight: 600, color: brandColors.primary, marginBottom: 16 }}>
                {userEmail}
              </p>
              <Alert
                type="info"
                showIcon
                message="Next Steps"
                description={
                  <ol style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                    <li>Check your email inbox</li>
                    <li>Click the verification link</li>
                    <li>Return here to sign in</li>
                  </ol>
                }
                style={{ marginBottom: 16 }}
              />
              <Text type="secondary" style={{ fontSize: 13 }}>
                Don&apos;t see it? Check your spam folder or wait a few minutes.
              </Text>
            </div>
          }
          extra={[
            <Link href="/auth/login" key="login">
              <Button type="primary" size="large">
                Go to Sign In
              </Button>
            </Link>,
          ]}
        />
      </AuthLayout>
    );
  }

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

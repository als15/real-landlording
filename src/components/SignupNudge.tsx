'use client';

import { Modal, Typography, Button, Form, Input, Space, Divider, message } from 'antd';
import { CheckCircleOutlined, UserAddOutlined } from '@ant-design/icons';
import { useState } from 'react';

const { Title, Text, Paragraph } = Typography;

interface SignupNudgeProps {
  open: boolean;
  email: string;
  requestId: string;
  onClose: () => void;
}

export default function SignupNudge({ open, email, requestId, onClose }: SignupNudgeProps) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSignup = async (values: { name: string; password: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: values.name,
          password: values.password,
          requestId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create account');
      }

      message.success('Account created! Check your email to verify.');
      onClose();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
      centered
    >
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
        <Title level={3} style={{ marginTop: 16 }}>
          Request Submitted!
        </Title>
        <Paragraph type="secondary">
          We&apos;ll match you with up to 3 vetted vendors and send introductions to{' '}
          <Text strong>{email}</Text>
        </Paragraph>
      </div>

      <Divider />

      <div style={{ textAlign: 'center' }}>
        <UserAddOutlined style={{ fontSize: 32, color: '#1890ff' }} />
        <Title level={4}>Create an Account to Track Your Request</Title>
        <Paragraph type="secondary">
          With an account you can:
        </Paragraph>
        <ul style={{ textAlign: 'left', maxWidth: 280, margin: '0 auto 24px' }}>
          <li>Track all your service requests</li>
          <li>View matched vendor details</li>
          <li>Leave reviews after jobs complete</li>
          <li>Faster submissions in the future</li>
        </ul>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSignup}
        initialValues={{ email }}
      >
        <Form.Item label="Email">
          <Input value={email} disabled />
        </Form.Item>

        <Form.Item
          name="name"
          label="Your Name"
          rules={[{ required: true, message: 'Please enter your name' }]}
        >
          <Input placeholder="John Smith" />
        </Form.Item>

        <Form.Item
          name="password"
          label="Create Password"
          rules={[
            { required: true, message: 'Please create a password' },
            { min: 8, message: 'Password must be at least 8 characters' },
          ]}
        >
          <Input.Password placeholder="At least 8 characters" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm Password"
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
          <Input.Password placeholder="Confirm your password" />
        </Form.Item>

        <Form.Item>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Create Account
            </Button>
            <Button onClick={onClose} block>
              Maybe Later
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

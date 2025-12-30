'use client';

import { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Space,
  App,
  Divider,
  Alert,
} from 'antd';
import { LockOutlined, SaveOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const { message } = App.useApp();

  const handleChangePassword = async (values: {
    current_password: string;
    new_password: string;
  }) => {
    setSaving(true);
    try {
      const response = await fetch('/api/landlord/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (response.ok) {
        message.success('Password changed successfully');
        form.resetFields();
      } else {
        throw new Error(data.message || 'Failed to change password');
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <Title level={2}>Settings</Title>
      <Text type="secondary">Manage your account settings</Text>

      <Card style={{ marginTop: 24 }}>
        <Title level={4}>Change Password</Title>

        <Form form={form} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            name="current_password"
            label="Current Password"
            rules={[{ required: true, message: 'Enter your current password' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Current password"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="new_password"
            label="New Password"
            rules={[
              { required: true, message: 'Enter a new password' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="New password (min 8 characters)"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            label="Confirm New Password"
            dependencies={['new_password']}
            rules={[
              { required: true, message: 'Confirm your new password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm new password"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />} size="large">
              Update Password
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card style={{ marginTop: 24 }}>
        <Title level={4}>Notification Preferences</Title>
        <Alert
          title="Coming Soon"
          description="Email notification preferences will be available in a future update."
          type="info"
          showIcon
        />
      </Card>

      <Card style={{ marginTop: 24 }}>
        <Title level={4} type="danger">Danger Zone</Title>
        <Text type="secondary">
          Need to delete your account? Contact us at support@reallandlording.com
        </Text>
      </Card>
    </div>
  );
}

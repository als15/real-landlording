'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Space,
  Spin,
  App,
  Divider,
} from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, SaveOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface LandlordProfile {
  id: string;
  email: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  request_count: number;
  created_at: string;
}

export default function ProfilePage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<LandlordProfile | null>(null);
  const { message } = App.useApp();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/landlord/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        form.setFieldsValue({
          first_name: data.first_name || data.name?.split(' ')[0] || '',
          last_name: data.last_name || data.name?.split(' ').slice(1).join(' ') || '',
          phone: data.phone || '',
        });
      } else if (response.status === 401) {
        window.location.href = '/auth/login?redirectTo=/dashboard/profile';
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      message.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: { first_name: string; last_name: string; phone: string }) => {
    setSaving(true);
    try {
      const response = await fetch('/api/landlord/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: values.first_name,
          last_name: values.last_name,
          name: `${values.first_name} ${values.last_name}`.trim(),
          phone: values.phone,
        }),
      });

      if (response.ok) {
        message.success('Profile updated successfully');
        fetchProfile();
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      message.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <Title level={2}>My Profile</Title>
      <Text type="secondary">Manage your account information</Text>

      <Card style={{ marginTop: 24 }}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item label="Email">
            <Input
              prefix={<MailOutlined />}
              value={profile?.email}
              disabled
              size="large"
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Email cannot be changed
            </Text>
          </Form.Item>

          <Space style={{ width: '100%' }} size="middle">
            <Form.Item
              name="first_name"
              label="First Name"
              rules={[{ required: true, message: 'Required' }]}
              style={{ flex: 1 }}
            >
              <Input prefix={<UserOutlined />} placeholder="First name" size="large" />
            </Form.Item>

            <Form.Item
              name="last_name"
              label="Last Name"
              rules={[{ required: true, message: 'Required' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="Last name" size="large" />
            </Form.Item>
          </Space>

          <Form.Item
            name="phone"
            label="Phone Number"
            extra={<span style={{ fontSize: 12, color: '#888' }}>By providing your phone number, you consent to receive SMS updates about your requests. Msg &amp; data rates may apply. Reply STOP to opt out.</span>}
          >
            <Input prefix={<PhoneOutlined />} placeholder="(215) 555-0123" size="large" />
          </Form.Item>

          <Divider />

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />} size="large">
              Save Changes
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card style={{ marginTop: 24 }}>
        <Title level={5}>Account Stats</Title>
        <Space orientation="vertical">
          <Text>
            <strong>Total Requests:</strong> {profile?.request_count || 0}
          </Text>
          <Text>
            <strong>Member Since:</strong>{' '}
            {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
          </Text>
        </Space>
      </Card>
    </div>
  );
}

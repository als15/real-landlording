'use client';

import { Modal, Button, Form, Input, App, Steps } from 'antd';
import {
  CheckCircleOutlined,
  EyeOutlined,
  BellOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { brandColors } from '@/theme/config';

interface SignupNudgeProps {
  open: boolean;
  email: string;
  requestId: string;
  requestCount?: number; // For graduated messaging
  onClose: () => void;
}

const benefits = [
  { icon: <EyeOutlined />, title: 'See vendor ratings' },
  { icon: <BellOutlined />, title: 'Real-time updates' },
  { icon: <SafetyCertificateOutlined />, title: 'Verified reviews' },
  { icon: <ThunderboltOutlined />, title: 'One-click requests' },
];

const nextSteps = [
  { title: 'Request Received', description: 'We got your request' },
  { title: 'Matching', description: 'Finding vendors for your project' },
  { title: 'Intro', description: 'Receive vendor(s) contact info via email or text' },
];

export default function SignupNudge({ open, email, requestId, requestCount = 1, onClose }: SignupNudgeProps) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  // Graduated messaging based on request count
  const isRepeatRequester = requestCount > 1;
  const headerText = isRepeatRequester
    ? `You have ${requestCount} requests!`
    : 'Request Submitted!';
  const subHeaderText = isRepeatRequester
    ? 'Create an account to track all your requests in one place'
    : `We'll email matches to`;

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
      width={440}
      centered
      closable={true}
      styles={{ body: { padding: 0 } }}
    >
      {/* Success Banner - different styling for repeat requesters */}
      <div
        style={{
          background: isRepeatRequester
            ? `linear-gradient(135deg, ${brandColors.accent} 0%, #c49a3d 100%)`
            : `linear-gradient(135deg, #52c41a 0%, #237804 100%)`,
          padding: '24px 24px 20px',
          textAlign: 'center',
        }}
      >
        {isRepeatRequester ? (
          <TeamOutlined style={{ fontSize: 40, color: '#fff', marginBottom: 12 }} />
        ) : (
          <CheckCircleOutlined style={{ fontSize: 40, color: '#fff', marginBottom: 12 }} />
        )}
        <h2 style={{ color: '#fff', margin: 0, fontSize: 24, fontWeight: 700 }}>
          {headerText}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.9)', margin: '8px 0 0', fontSize: 14 }}>
          {isRepeatRequester ? (
            subHeaderText
          ) : (
            <>We&apos;ll email matches to <strong>{email}</strong></>
          )}
        </p>
      </div>

      {/* What Happens Next */}
      <div
        style={{
          background: brandColors.background,
          padding: '16px 24px',
          borderBottom: `1px solid ${brandColors.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <ClockCircleOutlined style={{ color: brandColors.accent }} />
          <span style={{ fontWeight: 600, fontSize: 13, color: brandColors.textPrimary }}>
            What happens next
          </span>
        </div>
        <Steps
          size="small"
          current={0}
          items={nextSteps.map((step) => ({
            title: <span style={{ fontSize: 12 }}>{step.title}</span>,
            description: <span style={{ fontSize: 11, color: brandColors.textSecondary }}>{step.description}</span>,
          }))}
          style={{ marginBottom: 8 }}
        />
        <p style={{ margin: 0, fontSize: 12, color: brandColors.textSecondary, textAlign: 'center' }}>
          Check your phone and email. Matches usually send immediately.
        </p>
      </div>

      {/* Account Upsell */}
      <div style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, textAlign: 'center', color: brandColors.primary }}>
          {isRepeatRequester
            ? 'Manage all your requests in one dashboard:'
            : 'Create an account to unlock:'}
        </h3>

        {/* 4 Benefit Squares */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {benefits.map((benefit, i) => (
            <div
              key={i}
              style={{
                background: brandColors.background,
                border: `1px solid ${brandColors.border}`,
                borderRadius: 10,
                padding: '14px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 22, color: brandColors.accent, marginBottom: 6 }}>
                {benefit.icon}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: brandColors.textPrimary }}>
                {benefit.title}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Form */}
        <Form form={form} onFinish={handleSignup}>
          <Form.Item
            name="name"
            rules={[{ required: true, message: '' }]}
            style={{ marginBottom: 12 }}
          >
            <Input placeholder="Your name" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '' }, { min: 8, message: '' }]}
            style={{ marginBottom: 16 }}
          >
            <Input.Password placeholder="Password (8+ chars)" size="large" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
            style={{
              height: 48,
              fontWeight: 600,
              fontSize: 15,
              background: brandColors.accent,
              borderColor: brandColors.accent,
            }}
          >
            {isRepeatRequester ? 'Create Account & Track Requests' : 'Create Free Account'}
          </Button>
        </Form>

        <p style={{ textAlign: 'center', margin: '16px 0 0', fontSize: 12, color: brandColors.textSecondary }}>
          Join <strong>2,900+ landlords</strong> &bull;{' '}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: brandColors.textLight,
              fontSize: 12,
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            Skip for now
          </button>
        </p>
      </div>
    </Modal>
  );
}

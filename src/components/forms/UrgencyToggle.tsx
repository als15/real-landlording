'use client';

import { Radio, Typography } from 'antd';
import { CalendarOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { SimpleUrgency, SIMPLE_URGENCY_OPTIONS } from '@/types/database';

const { Text } = Typography;

interface UrgencyToggleProps {
  value?: SimpleUrgency;
  onChange?: (value: SimpleUrgency) => void;
  emergencyEnabled?: boolean;
}

export default function UrgencyToggle({ value = 'standard', onChange, emergencyEnabled = true }: UrgencyToggleProps) {
  // Filter options based on whether emergency is enabled
  const options = emergencyEnabled
    ? SIMPLE_URGENCY_OPTIONS
    : SIMPLE_URGENCY_OPTIONS.filter((o) => o.value !== 'emergency');

  // If only one option, don't show the toggle
  if (options.length <= 1) {
    return null;
  }

  return (
    <Radio.Group
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      style={{ width: '100%', display: 'flex', gap: 12 }}
    >
      {options.map((option) => (
        <Radio.Button
          key={option.value}
          value={option.value}
          style={{
            flex: 1,
            height: 'auto',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            borderRadius: 8,
            border: value === option.value
              ? option.value === 'emergency'
                ? '2px solid #ff7a45'
                : '2px solid #1677ff'
              : '1px solid #d9d9d9',
            backgroundColor: value === option.value
              ? option.value === 'emergency'
                ? '#fff7e6'
                : '#e6f4ff'
              : 'white',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {option.value === 'standard' ? (
                <CalendarOutlined style={{ fontSize: 18, color: '#1677ff' }} />
              ) : (
                <ThunderboltOutlined style={{ fontSize: 18, color: '#ff7a45' }} />
              )}
              <Text
                strong
                style={{
                  color: option.value === 'emergency' ? '#d4380d' : '#1677ff',
                  fontSize: 15,
                }}
              >
                {option.label}
              </Text>
            </div>
            <Text
              type="secondary"
              style={{ fontSize: 13, lineHeight: 1.4 }}
            >
              {option.description}
            </Text>
          </div>
        </Radio.Button>
      ))}
    </Radio.Group>
  );
}

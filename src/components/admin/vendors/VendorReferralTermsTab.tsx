'use client'

import { useState } from 'react'
import { Descriptions, Button, Form, Select, Input, InputNumber, Switch, DatePicker, Space, Typography, Divider } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  Vendor,
  REFERRAL_FEE_TYPE_LABELS,
  REFERRAL_CALCULATION_BASIS_LABELS,
  REFERRAL_FEE_TRIGGER_LABELS,
  REFERRAL_LATE_FEE_RATE_TYPE_LABELS,
} from '@/types/database'

const { Text } = Typography
const { TextArea } = Input

interface VendorReferralTermsTabProps {
  vendor: Vendor
  onUpdate: (updates: Record<string, unknown>) => Promise<void>
  saving: boolean
}

export default function VendorReferralTermsTab({ vendor, onUpdate, saving }: VendorReferralTermsTabProps) {
  const [editing, setEditing] = useState(false)
  const [form] = Form.useForm()

  const handleStartEdit = () => {
    form.setFieldsValue({
      referral_fee_type: vendor.referral_fee_type || 'percentage',
      referral_fee_percentage: vendor.referral_fee_percentage ?? 5,
      referral_fee_flat_amount: vendor.referral_fee_flat_amount,
      referral_calculation_basis: vendor.referral_calculation_basis || 'gross_invoice',
      referral_fee_trigger: vendor.referral_fee_trigger || 'upon_vendor_paid',
      referral_payment_due_days: vendor.referral_payment_due_days ?? 7,
      referral_late_fee_enabled: vendor.referral_late_fee_enabled ?? true,
      referral_late_fee_rate_type: vendor.referral_late_fee_rate_type || 'percentage_per_month',
      referral_late_fee_rate_value: vendor.referral_late_fee_rate_value ?? 1.5,
      referral_late_fee_grace_period_days: vendor.referral_late_fee_grace_period_days ?? 0,
      referral_repeat_fee_modifier: vendor.referral_repeat_fee_modifier ?? 50,
      referral_repeat_fee_window_months: vendor.referral_repeat_fee_window_months ?? 24,
      referral_terms_effective_date: vendor.referral_terms_effective_date ? dayjs(vendor.referral_terms_effective_date) : dayjs(),
      referral_terms_version: vendor.referral_terms_version || 'v1.0',
      referral_custom_terms_notes: vendor.referral_custom_terms_notes,
    })
    setEditing(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()

      const referralDate = values.referral_terms_effective_date
      const referralFeeType = values.referral_fee_type as string
      const lateFeeEnabled = values.referral_late_fee_enabled as boolean
      const feeTrigger = values.referral_fee_trigger as string

      const updateData = {
        referral_fee_type: values.referral_fee_type,
        referral_fee_percentage: referralFeeType === 'flat_fee' ? 0 : values.referral_fee_percentage,
        referral_fee_flat_amount: referralFeeType === 'percentage' ? null : values.referral_fee_flat_amount,
        referral_calculation_basis: values.referral_calculation_basis,
        referral_fee_trigger: values.referral_fee_trigger,
        referral_payment_due_days: values.referral_payment_due_days,
        referral_late_fee_enabled: values.referral_late_fee_enabled,
        referral_late_fee_rate_type: lateFeeEnabled ? values.referral_late_fee_rate_type : 'none',
        referral_late_fee_rate_value: lateFeeEnabled ? values.referral_late_fee_rate_value : 0,
        referral_late_fee_grace_period_days: lateFeeEnabled ? values.referral_late_fee_grace_period_days : 0,
        referral_repeat_fee_modifier: values.referral_repeat_fee_modifier,
        referral_repeat_fee_window_months: values.referral_repeat_fee_window_months,
        referral_terms_effective_date: referralDate && typeof referralDate === 'object' && 'format' in referralDate
          ? (referralDate as dayjs.Dayjs).format('YYYY-MM-DD')
          : referralDate,
        referral_terms_version: values.referral_terms_version,
        referral_custom_terms_notes: feeTrigger === 'custom' ? values.referral_custom_terms_notes : (values.referral_custom_terms_notes || null),
      }

      await onUpdate(updateData)
      setEditing(false)
    } catch {
      // validation error
    }
  }

  if (editing) {
    return (
      <Form form={form} layout="vertical">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <Space>
            <Button onClick={() => setEditing(false)}>Cancel</Button>
            <Button type="primary" onClick={handleSave} loading={saving}>Save</Button>
          </Space>
        </div>

        <Form.Item name="referral_fee_type" label="Fee Type">
          <Select options={Object.entries(REFERRAL_FEE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prev, cur) => prev.referral_fee_type !== cur.referral_fee_type}>
          {({ getFieldValue }) => {
            const feeType = getFieldValue('referral_fee_type')
            return (
              <>
                {(feeType === 'percentage' || feeType === 'percentage_plus_flat') && (
                  <Form.Item name="referral_fee_percentage" label="Fee Percentage (%)">
                    <InputNumber min={0} max={100} step={0.5} addonAfter="%" style={{ width: '100%' }} />
                  </Form.Item>
                )}
                {(feeType === 'flat_fee' || feeType === 'percentage_plus_flat') && (
                  <Form.Item name="referral_fee_flat_amount" label="Flat Fee Amount ($)">
                    <InputNumber min={0} step={5} addonBefore="$" style={{ width: '100%' }} />
                  </Form.Item>
                )}
              </>
            )
          }}
        </Form.Item>

        <Form.Item name="referral_calculation_basis" label="Calculation Basis">
          <Select options={Object.entries(REFERRAL_CALCULATION_BASIS_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
        </Form.Item>

        <Form.Item name="referral_fee_trigger" label="Fee Trigger">
          <Select options={Object.entries(REFERRAL_FEE_TRIGGER_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prev, cur) => prev.referral_fee_trigger !== cur.referral_fee_trigger}>
          {({ getFieldValue }) =>
            getFieldValue('referral_fee_trigger') === 'custom' ? (
              <Form.Item
                name="referral_custom_terms_notes"
                label="Custom Terms Notes"
                rules={[{ required: true, message: 'Custom terms notes are required when trigger is Custom' }]}
              >
                <TextArea rows={3} placeholder="Describe the custom fee trigger terms..." />
              </Form.Item>
            ) : null
          }
        </Form.Item>

        <Form.Item name="referral_payment_due_days" label="Payment Due (days after trigger)">
          <InputNumber min={0} max={365} style={{ width: '100%' }} />
        </Form.Item>

        <Divider titlePlacement="left" plain>Late Fee Policy</Divider>

        <Form.Item name="referral_late_fee_enabled" label="Late Fee Enabled" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prev, cur) => prev.referral_late_fee_enabled !== cur.referral_late_fee_enabled}>
          {({ getFieldValue }) =>
            getFieldValue('referral_late_fee_enabled') ? (
              <>
                <Form.Item name="referral_late_fee_rate_type" label="Late Fee Rate Type">
                  <Select options={Object.entries(REFERRAL_LATE_FEE_RATE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
                </Form.Item>
                <Form.Item name="referral_late_fee_rate_value" label="Late Fee Rate Value">
                  <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="referral_late_fee_grace_period_days" label="Grace Period (days)">
                  <InputNumber min={0} max={365} style={{ width: '100%' }} />
                </Form.Item>
              </>
            ) : null
          }
        </Form.Item>

        <Divider titlePlacement="left" plain>Repeat Business Terms</Divider>

        <Form.Item name="referral_repeat_fee_modifier" label="Repeat Fee Modifier" extra="Percentage of original fee for repeat landlord-vendor pairs">
          <InputNumber min={0} max={100} step={5} addonAfter="%" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="referral_repeat_fee_window_months" label="Repeat Window (months)" extra="Months within which a returning pair is considered repeat">
          <InputNumber min={0} max={120} style={{ width: '100%' }} />
        </Form.Item>

        <Divider titlePlacement="left" plain>Versioning</Divider>

        <Form.Item name="referral_terms_effective_date" label="Terms Effective Date">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="referral_terms_version" label="Terms Version">
          <Input placeholder="v1.0" />
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prev, cur) => prev.referral_fee_trigger !== cur.referral_fee_trigger}>
          {({ getFieldValue }) =>
            getFieldValue('referral_fee_trigger') !== 'custom' ? (
              <Form.Item name="referral_custom_terms_notes" label="Custom Terms Notes (optional)">
                <TextArea rows={2} placeholder="Additional notes about referral terms..." />
              </Form.Item>
            ) : null
          }
        </Form.Item>
      </Form>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button icon={<EditOutlined />} onClick={handleStartEdit}>Edit</Button>
      </div>

      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label="Fee Type">
          {REFERRAL_FEE_TYPE_LABELS[vendor.referral_fee_type] || vendor.referral_fee_type}
        </Descriptions.Item>
        <Descriptions.Item label="Fee Value">
          {(() => {
            const t = vendor.referral_fee_type
            if (t === 'percentage') return `${vendor.referral_fee_percentage}%`
            if (t === 'flat_fee') return `$${vendor.referral_fee_flat_amount ?? 0}`
            if (t === 'percentage_plus_flat') return `${vendor.referral_fee_percentage}% + $${vendor.referral_fee_flat_amount ?? 0}`
            return '-'
          })()}
        </Descriptions.Item>
        <Descriptions.Item label="Calculation Basis">
          {REFERRAL_CALCULATION_BASIS_LABELS[vendor.referral_calculation_basis] || vendor.referral_calculation_basis}
        </Descriptions.Item>
        <Descriptions.Item label="Fee Trigger">
          {REFERRAL_FEE_TRIGGER_LABELS[vendor.referral_fee_trigger] || vendor.referral_fee_trigger}
        </Descriptions.Item>
        <Descriptions.Item label="Payment Due">
          {vendor.referral_payment_due_days} days
        </Descriptions.Item>
        <Descriptions.Item label="Late Fee">
          {vendor.referral_late_fee_enabled
            ? `${REFERRAL_LATE_FEE_RATE_TYPE_LABELS[vendor.referral_late_fee_rate_type] || vendor.referral_late_fee_rate_type}: ${vendor.referral_late_fee_rate_value}${vendor.referral_late_fee_rate_type === 'percentage_per_month' ? '%' : '$'}${vendor.referral_late_fee_grace_period_days > 0 ? ` (${vendor.referral_late_fee_grace_period_days}d grace)` : ''}`
            : 'Disabled'}
        </Descriptions.Item>
        <Descriptions.Item label="Repeat Fee">
          {vendor.referral_repeat_fee_modifier}% within {vendor.referral_repeat_fee_window_months} months
        </Descriptions.Item>
        <Descriptions.Item label="Terms Version">
          {vendor.referral_terms_version}{vendor.referral_terms_effective_date ? ` (eff. ${new Date(vendor.referral_terms_effective_date).toLocaleDateString()})` : ''}
        </Descriptions.Item>
      </Descriptions>

      {vendor.referral_custom_terms_notes && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">Custom Terms: </Text>
          <Text>{vendor.referral_custom_terms_notes}</Text>
        </div>
      )}
    </>
  )
}

'use client';

import { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  InputNumber,
  Typography,
  Card,
  Row,
  Col,
  message,
  Divider,
} from 'antd';
import {
  ServiceCategory,
  UrgencyLevel,
  SERVICE_TAXONOMY,
  URGENCY_LABELS,
  ServiceRequestInput,
  getServiceCategoryOptions,
} from '@/types/database';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface ServiceRequestFormProps {
  onSuccess?: (requestId: string, email: string) => void;
}

export default function ServiceRequestForm({ onSuccess }: ServiceRequestFormProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);

  const categoryOptions = getServiceCategoryOptions();

  const urgencyOptions = Object.entries(URGENCY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  // Get classifications for selected category
  const classifications = selectedCategory ? SERVICE_TAXONOMY[selectedCategory].classifications : [];

  // Reset service_details when category changes
  useEffect(() => {
    if (selectedCategory) {
      // Clear previous service_details selections
      const fieldsToReset: Record<string, undefined> = {};
      Object.keys(form.getFieldsValue()).forEach((key) => {
        if (key.startsWith('service_detail_')) {
          fieldsToReset[key] = undefined;
        }
      });
      form.setFieldsValue(fieldsToReset);
    }
  }, [selectedCategory, form]);

  const onFinish = async (values: Record<string, unknown>) => {
    setLoading(true);
    try {
      // Build service_details from form values
      const serviceDetails: Record<string, string> = {};
      Object.entries(values).forEach(([key, value]) => {
        if (key.startsWith('service_detail_') && value) {
          const label = key.replace('service_detail_', '').replace(/_/g, ' ');
          serviceDetails[label] = value as string;
        }
      });

      const requestData: ServiceRequestInput = {
        landlord_email: values.landlord_email as string,
        landlord_name: values.landlord_name as string,
        landlord_phone: values.landlord_phone as string | undefined,
        service_type: values.service_type as ServiceCategory,
        service_details: Object.keys(serviceDetails).length > 0 ? serviceDetails : undefined,
        property_location: values.property_location as string,
        job_description: values.job_description as string,
        urgency: values.urgency as UrgencyLevel,
        budget_min: values.budget_min as number | undefined,
        budget_max: values.budget_max as number | undefined,
      };

      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit request');
      }

      const data = await response.json();
      message.success('Request submitted successfully! We\'ll match you with vendors soon.');
      form.resetFields();
      setSelectedCategory(null);

      if (onSuccess) {
        onSuccess(data.id, requestData.landlord_email);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (value: ServiceCategory) => {
    setSelectedCategory(value);
  };

  return (
    <Card>
      <Title level={3}>Request a Service</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Tell us what you need and we&apos;ll match you with vetted vendors in Philadelphia.
      </Text>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ urgency: 'medium' }}
      >
        <Title level={5}>Contact Information</Title>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="landlord_name"
              label="Your Name"
              rules={[{ required: true, message: 'Please enter your name' }]}
            >
              <Input placeholder="John Smith" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="landlord_email"
              label="Email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input placeholder="john@example.com" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="landlord_phone" label="Phone (optional)">
          <Input placeholder="(215) 555-0123" />
        </Form.Item>

        <Divider />
        <Title level={5}>Service Details</Title>

        <Form.Item
          name="service_type"
          label="What service do you need?"
          rules={[{ required: true, message: 'Please select a service type' }]}
        >
          <Select
            placeholder="Select a service category"
            options={categoryOptions}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            onChange={handleCategoryChange}
          />
        </Form.Item>

        {/* Dynamic sub-category questions */}
        {classifications.map((classification, index) => {
          const fieldName = `service_detail_${classification.label.replace(/\s+/g, '_')}`;
          return (
            <Form.Item
              key={index}
              name={fieldName}
              label={classification.label}
              rules={[{ required: true, message: `Please select ${classification.label.toLowerCase()}` }]}
            >
              <Select
                placeholder={`Select ${classification.label.toLowerCase()}`}
                options={classification.options.map((opt) => ({ value: opt, label: opt }))}
              />
            </Form.Item>
          );
        })}

        <Form.Item
          name="property_location"
          label="Property Location"
          rules={[{ required: true, message: 'Please enter the property location' }]}
          extra="Enter the zip code or full address"
        >
          <Input placeholder="19103 or 123 Main St, Philadelphia, PA" />
        </Form.Item>

        <Form.Item
          name="job_description"
          label="Describe the Job"
          rules={[
            { required: true, message: 'Please describe the job' },
            { min: 20, message: 'Please provide more detail (at least 20 characters)' },
          ]}
        >
          <TextArea
            rows={4}
            placeholder="Describe what you need done, any special requirements, access instructions, etc."
          />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="urgency"
              label="How urgent is this?"
              rules={[{ required: true }]}
            >
              <Select options={urgencyOptions} />
            </Form.Item>
          </Col>
        </Row>

        <Divider />
        <Title level={5}>Budget (Optional)</Title>
        <Row gutter={16}>
          <Col xs={12}>
            <Form.Item name="budget_min" label="Min Budget">
              <InputNumber
                style={{ width: '100%' }}
                prefix="$"
                min={0}
                placeholder="0"
              />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item name="budget_max" label="Max Budget">
              <InputNumber
                style={{ width: '100%' }}
                prefix="$"
                min={0}
                placeholder="5000"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginTop: 24 }}>
          <Button type="primary" htmlType="submit" loading={loading} size="large" block>
            Submit Request
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Typography,
  Card,
  Row,
  Col,
  App,
  Steps,
  Divider,
} from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, SendOutlined } from '@ant-design/icons';
import {
  ServiceCategory,
  UrgencyLevel,
  PropertyType,
  UnitCount,
  OccupancyStatus,
  ContactPreference,
  BudgetRange,
  SERVICE_TAXONOMY,
  URGENCY_LABELS,
  PROPERTY_TYPE_LABELS,
  UNIT_COUNT_LABELS,
  OCCUPANCY_STATUS_LABELS,
  CONTACT_PREFERENCE_LABELS,
  BUDGET_RANGE_LABELS,
  ServiceRequestInput,
  getServiceCategoryOptions,
} from '@/types/database';
import AddressAutocomplete, { AddressData } from '@/components/AddressAutocomplete';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface MultiStepServiceRequestFormProps {
  onSuccess?: (requestId: string, email: string) => void;
}

export default function MultiStepServiceRequestForm({ onSuccess }: MultiStepServiceRequestFormProps) {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const { message } = App.useApp();

  const categoryOptions = getServiceCategoryOptions();

  const propertyTypeOptions = Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const unitCountOptions = Object.entries(UNIT_COUNT_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const occupancyOptions = Object.entries(OCCUPANCY_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const contactPreferenceOptions = Object.entries(CONTACT_PREFERENCE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const urgencyOptions = Object.entries(URGENCY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const budgetOptions = Object.entries(BUDGET_RANGE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  // Get classifications for selected category
  const classifications = selectedCategory ? SERVICE_TAXONOMY[selectedCategory].classifications : [];

  // Reset service_details when category changes
  useEffect(() => {
    if (selectedCategory) {
      const fieldsToReset: Record<string, undefined> = {};
      Object.keys(form.getFieldsValue()).forEach((key) => {
        if (key.startsWith('service_detail_')) {
          fieldsToReset[key] = undefined;
        }
      });
      form.setFieldsValue(fieldsToReset);
    }
  }, [selectedCategory, form]);

  const validateStep1 = async () => {
    try {
      await form.validateFields([
        'landlord_name',
        'landlord_email',
        'property_address',
        'zip_code',
      ]);
      return true;
    } catch {
      return false;
    }
  };

  const handleNext = async () => {
    const isValid = await validateStep1();
    if (isValid) {
      setCurrentStep(1);
    }
  };

  const handleBack = () => {
    setCurrentStep(0);
  };

  const handleCategoryChange = (value: ServiceCategory) => {
    setSelectedCategory(value);
  };

  const handleAddressSelect = (addressData: AddressData) => {
    // Auto-fill zip code from selected address
    if (addressData.zip_code) {
      form.setFieldsValue({ zip_code: addressData.zip_code });
    }
    // Store coordinates for later
    if (addressData.lat && addressData.lng) {
      setCoordinates({ lat: addressData.lat, lng: addressData.lng });
    }
  };

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
        contact_preference: values.contact_preference as ContactPreference | undefined,
        property_address: values.property_address as string,
        zip_code: values.zip_code as string,
        property_type: values.property_type as PropertyType | undefined,
        unit_count: values.unit_count as UnitCount | undefined,
        occupancy_status: values.occupancy_status as OccupancyStatus | undefined,
        latitude: coordinates?.lat,
        longitude: coordinates?.lng,
        service_type: values.service_type as ServiceCategory,
        service_details: Object.keys(serviceDetails).length > 0 ? serviceDetails : undefined,
        job_description: values.job_description as string,
        urgency: values.urgency as UrgencyLevel,
        budget_range: values.budget_range as BudgetRange | undefined,
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
      setCurrentStep(0);
      setSelectedCategory(null);
      setCoordinates(null);

      if (onSuccess) {
        onSuccess(data.id, requestData.landlord_email);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { title: 'Your Info', description: 'Contact & Property' },
    { title: 'Project Details', description: 'Service & Description' },
  ];

  const onFinishFailed = (errorInfo: { errorFields: { name: (string | number)[]; errors: string[] }[] }) => {
    console.log('Form validation failed:', errorInfo);
    // Check if errors are on step 1 fields (hidden when on step 2)
    const step1Fields = ['landlord_name', 'landlord_email', 'property_address', 'zip_code'];
    const hasStep1Errors = errorInfo.errorFields.some(field =>
      step1Fields.includes(field.name[0] as string)
    );

    if (hasStep1Errors && currentStep === 1) {
      message.error('Please go back and complete the required fields in Step 1');
      setCurrentStep(0);
    } else {
      // Show first error message
      const firstError = errorInfo.errorFields[0]?.errors[0];
      if (firstError) {
        message.error(firstError);
      }
    }
  };

  return (
    <>
      <Steps
        current={currentStep}
        items={steps}
        style={{ marginBottom: 32 }}
        size="small"
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        initialValues={{ urgency: 'medium' }}
      >
        {/* Step 1: Contact & Property Info */}
        <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
          <Title level={5}>Contact Information</Title>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="landlord_name"
                label="Your Name"
                rules={[{ required: true, message: 'Please enter your name' }]}
              >
                <Input placeholder="John Smith" size="large" />
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
                <Input placeholder="john@example.com" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="landlord_phone" label="Phone (optional)">
                <Input placeholder="(215) 555-0123" size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="contact_preference" label="Best way to reach you">
                <Select
                  placeholder="Select preference"
                  options={contactPreferenceOptions}
                  size="large"
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />
          <Title level={5}>Property Information</Title>

          <Form.Item
            name="property_address"
            label="Property Address"
            rules={[{ required: true, message: 'Please enter the property address' }]}
            extra="Start typing and select from suggestions to auto-fill zip code"
          >
            <AddressAutocomplete
              placeholder="Start typing an address..."
              onAddressSelect={handleAddressSelect}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="zip_code"
                label="Zip Code"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="19103" size="large" maxLength={10} />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item name="property_type" label="Property Type">
                <Select
                  placeholder="Select property type"
                  options={propertyTypeOptions}
                  size="large"
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="unit_count" label="Number of Units">
                <Select
                  placeholder="Select unit count"
                  options={unitCountOptions}
                  size="large"
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="occupancy_status" label="Occupancy Status">
                <Select
                  placeholder="Select status"
                  options={occupancyOptions}
                  size="large"
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: 24 }}>
            <Button
              type="primary"
              size="large"
              block
              onClick={handleNext}
              icon={<ArrowRightOutlined />}
            >
              Next: Project Details
            </Button>
          </Form.Item>
        </div>

        {/* Step 2: Service Details */}
        <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
          <Title level={5}>Service Information</Title>

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
              size="large"
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
                  size="large"
                />
              </Form.Item>
            );
          })}

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
              size="large"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="urgency"
                label="How urgent is this?"
                rules={[{ required: true }]}
              >
                <Select options={urgencyOptions} size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="budget_range" label="Budget Range (optional)">
                <Select
                  placeholder="Select budget range"
                  options={budgetOptions}
                  size="large"
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: 24 }}>
            <Col xs={24} md={8}>
              <Button
                size="large"
                block
                onClick={handleBack}
                icon={<ArrowLeftOutlined />}
              >
                Back
              </Button>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  block
                  icon={<SendOutlined />}
                >
                  Submit Request
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </div>
      </Form>
    </>
  );
}

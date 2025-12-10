'use client';

import { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Typography,
  Row,
  Col,
  App,
  Steps,
  Divider,
  Radio,
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
  FinishLevel,
  SimpleUrgency,
  SERVICE_TAXONOMY,
  PROPERTY_TYPE_LABELS,
  UNIT_COUNT_LABELS,
  OCCUPANCY_STATUS_LABELS,
  CONTACT_PREFERENCE_LABELS,
  BUDGET_RANGE_LABELS,
  FINISH_LEVEL_LABELS,
  SIMPLE_URGENCY_OPTIONS,
  ServiceRequestInput,
  getGroupedServiceCategories,
} from '@/types/database';
import AddressAutocomplete, { AddressData } from '@/components/AddressAutocomplete';
import UrgencyToggle from '@/components/forms/UrgencyToggle';
import MediaUpload from '@/components/MediaUpload';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { OptGroup, Option } = Select;

interface MultiStepServiceRequestFormProps {
  onSuccess?: (requestId: string, email: string, isLoggedIn: boolean) => void;
}

export default function MultiStepServiceRequestForm({ onSuccess }: MultiStepServiceRequestFormProps) {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isOwner, setIsOwner] = useState(true);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { message } = App.useApp();

  // Check if user is logged in and pre-fill their info
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch('/api/landlord/profile');
        if (response.ok) {
          const data = await response.json();
          setIsLoggedIn(true);
          // Pre-fill form with user data
          form.setFieldsValue({
            first_name: data.first_name || data.name?.split(' ')[0] || '',
            last_name: data.last_name || data.name?.split(' ').slice(1).join(' ') || '',
            landlord_email: data.email,
            landlord_phone: data.phone || '',
          });
        }
      } catch {
        // Not logged in, that's okay
      }
    };
    fetchUserProfile();
  }, [form]);

  // Get grouped categories for dropdown
  const groupedCategories = getGroupedServiceCategories();

  // Options for dropdowns
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

  const budgetOptions = Object.entries(BUDGET_RANGE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const finishLevelOptions = Object.entries(FINISH_LEVEL_LABELS).map(([value, label]) => ({
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

  // Step validation functions
  const validateStep1 = async () => {
    try {
      const fields = ['service_type'];
      // Add dynamic classification fields
      if (classifications.length > 0) {
        classifications.forEach((c) => {
          fields.push(`service_detail_${c.label.replace(/\s+/g, '_')}`);
        });
      }
      await form.validateFields(fields);
      return true;
    } catch {
      return false;
    }
  };

  const validateStep2 = async () => {
    try {
      await form.validateFields(['job_description']);
      return true;
    } catch {
      return false;
    }
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      const isValid = await validateStep1();
      if (isValid) setCurrentStep(1);
    } else if (currentStep === 1) {
      const isValid = await validateStep2();
      if (isValid) setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleCategoryChange = (value: ServiceCategory) => {
    setSelectedCategory(value);
  };

  const handleAddressSelect = (addressData: AddressData) => {
    if (addressData.zip_code) {
      form.setFieldsValue({ zip_code: addressData.zip_code });
    }
    if (addressData.lat && addressData.lng) {
      setCoordinates({ lat: addressData.lat, lng: addressData.lng });
    }
  };

  const handleIsOwnerChange = (value: boolean) => {
    setIsOwner(value);
    if (value) {
      form.setFieldsValue({ business_name: undefined });
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

      // Map simple urgency to UrgencyLevel
      const simpleUrgency = (values.urgency as SimpleUrgency) || 'standard';
      const urgencyMapping = SIMPLE_URGENCY_OPTIONS.find((o) => o.value === simpleUrgency);
      const urgency: UrgencyLevel = urgencyMapping?.mapsTo || 'medium';

      const requestData: ServiceRequestInput = {
        landlord_email: values.landlord_email as string,
        first_name: values.first_name as string,
        last_name: values.last_name as string,
        landlord_phone: values.landlord_phone as string | undefined,
        contact_preference: values.contact_preference as ContactPreference | undefined,
        is_owner: values.is_owner as boolean,
        business_name: values.business_name as string | undefined,
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
        urgency,
        finish_level: values.finish_level as FinishLevel | undefined,
        budget_range: values.budget_range as BudgetRange | undefined,
        media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
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
      setMediaUrls([]);
      setIsOwner(true);

      if (onSuccess) {
        onSuccess(data.id, requestData.landlord_email, isLoggedIn);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { title: 'Service', description: 'What do you need?' },
    { title: 'Details', description: 'Tell us more' },
    { title: 'Your Info', description: 'Contact & Property' },
  ];

  const onFinishFailed = (errorInfo: { errorFields: { name: (string | number)[]; errors: string[] }[] }) => {
    // Find which step has errors and navigate there
    const step1Fields = ['service_type'];
    classifications.forEach((c) => {
      step1Fields.push(`service_detail_${c.label.replace(/\s+/g, '_')}`);
    });
    const step2Fields = ['job_description'];
    const step3Fields = ['first_name', 'last_name', 'landlord_email', 'property_address', 'zip_code'];

    const hasStep1Errors = errorInfo.errorFields.some((field) =>
      step1Fields.includes(field.name[0] as string)
    );
    const hasStep2Errors = errorInfo.errorFields.some((field) =>
      step2Fields.includes(field.name[0] as string)
    );
    const hasStep3Errors = errorInfo.errorFields.some((field) =>
      step3Fields.includes(field.name[0] as string)
    );

    if (hasStep1Errors && currentStep !== 0) {
      message.error('Please complete the service selection');
      setCurrentStep(0);
    } else if (hasStep2Errors && currentStep !== 1) {
      message.error('Please complete the job details');
      setCurrentStep(1);
    } else if (hasStep3Errors && currentStep !== 2) {
      message.error('Please complete your contact information');
      setCurrentStep(2);
    } else {
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
        initialValues={{ urgency: 'standard', is_owner: true }}
      >
        {/* Step 1: Service Selection */}
        <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
          <Title level={5}>What service do you need?</Title>

          <Form.Item
            name="service_type"
            label="Service Category"
            rules={[{ required: true, message: 'Please select a service type' }]}
          >
            <Select
              placeholder="Select a service category"
              showSearch
              filterOption={(input, option) => {
                // Handle both Option and OptGroup
                const children = option?.children;
                if (children && typeof children === 'string') {
                  return (children as string).toLowerCase().includes(input.toLowerCase());
                }
                return false;
              }}
              onChange={handleCategoryChange}
              size="large"
            >
              {groupedCategories.map((group) => (
                <OptGroup key={group.group} label={group.label}>
                  {group.categories.map((cat) => (
                    <Option key={cat.value} value={cat.value}>
                      {cat.label}
                    </Option>
                  ))}
                </OptGroup>
              ))}
            </Select>
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
            name="finish_level"
            label="Finish Level"
            extra="This helps vendors recommend appropriate materials and solutions"
          >
            <Select
              placeholder="Select finish level"
              options={finishLevelOptions}
              size="large"
              allowClear
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Button
              type="primary"
              size="large"
              block
              onClick={handleNext}
              icon={<ArrowRightOutlined />}
            >
              Next: Job Details
            </Button>
          </Form.Item>
        </div>

        {/* Step 2: Job Details */}
        <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
          <Title level={5}>Tell us about the job</Title>

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

          <Form.Item
            name="urgency"
            label="How urgent is this?"
          >
            <UrgencyToggle />
          </Form.Item>

          <Form.Item
            label="Photos or Videos (optional)"
            extra="Photos help vendors provide accurate estimates"
          >
            <MediaUpload
              value={mediaUrls}
              onChange={setMediaUrls}
            />
          </Form.Item>

          <Form.Item name="budget_range" label="Budget Range (optional)">
            <Select
              placeholder="Select budget range"
              options={budgetOptions}
              size="large"
              allowClear
            />
          </Form.Item>

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
              <Button
                type="primary"
                size="large"
                block
                onClick={handleNext}
                icon={<ArrowRightOutlined />}
              >
                Next: Your Info
              </Button>
            </Col>
          </Row>
        </div>

        {/* Step 3: Contact & Property Info */}
        <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
          <Title level={5}>Contact Information</Title>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="first_name"
                label="First Name"
                rules={[{ required: true, message: 'Please enter your first name' }]}
              >
                <Input placeholder="John" size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="last_name"
                label="Last Name"
                rules={[{ required: true, message: 'Please enter your last name' }]}
              >
                <Input placeholder="Smith" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
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
            <Col xs={24} md={12}>
              <Form.Item name="landlord_phone" label="Phone">
                <Input placeholder="(215) 555-0123" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
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
            <Col xs={24} md={12}>
              <Form.Item
                name="is_owner"
                label="Are you the property owner?"
              >
                <Radio.Group
                  onChange={(e) => handleIsOwnerChange(e.target.value)}
                  value={isOwner}
                >
                  <Radio value={true}>Yes</Radio>
                  <Radio value={false}>No</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          {!isOwner && (
            <Form.Item
              name="business_name"
              label="Business/Company Name"
              rules={[{ required: !isOwner, message: 'Please enter your business name' }]}
            >
              <Input placeholder="ABC Property Management" size="large" />
            </Form.Item>
          )}

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

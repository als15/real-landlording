'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  Typography,
  Descriptions,
  Tag,
  Space,
  Spin,
  Alert,
  Divider,
  Row,
  Col,
  Button,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Checkbox,
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  DollarOutlined,
  EditOutlined,
  InstagramOutlined,
  FacebookOutlined,
  LinkedinOutlined,
} from '@ant-design/icons';
import {
  Vendor,
  CONTACT_PREFERENCE_LABELS,
  EMPLOYEE_COUNT_OPTIONS,
  JOB_SIZE_RANGE_OPTIONS,
  ACCEPTED_PAYMENTS_OPTIONS,
  ContactPreference,
} from '@/types/database';
import { useServiceTaxonomy } from '@/hooks/useServiceTaxonomy';
import { brandColors } from '@/theme/config';
import ServiceAreaDisplay from '@/components/ServiceAreaDisplay';
import { useNotify } from '@/hooks/useNotify';

const { Title, Text } = Typography;

type EditSection = 'contact' | 'services' | 'qualifications' | 'business' | null;

export default function VendorProfilePage() {
  const { labels: SERVICE_TYPE_LABELS, categories } = useServiceTaxonomy();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<EditSection>(null);
  const [saving, setSaving] = useState(false);
  const { message } = useNotify();
  const [form] = Form.useForm();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/vendor/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      const { data } = await response.json();
      setVendor(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (section: EditSection) => {
    if (!vendor) return;
    setEditingSection(section);

    // Pre-populate form with current values
    switch (section) {
      case 'contact':
        form.setFieldsValue({
          contact_name: vendor.contact_name,
          phone: vendor.phone,
          website: vendor.website,
          location: vendor.location,
          call_preferences: vendor.call_preferences,
          social_instagram: vendor.social_instagram,
          social_facebook: vendor.social_facebook,
          social_linkedin: vendor.social_linkedin,
        });
        break;
      case 'services':
        form.setFieldsValue({
          services: vendor.services,
          service_areas: vendor.service_areas,
          licensed_areas: vendor.licensed_areas,
        });
        break;
      case 'qualifications':
        form.setFieldsValue({
          licensed: vendor.licensed,
          insured: vendor.insured,
          rental_experience: vendor.rental_experience,
          license_not_required: vendor.license_not_required,
          not_currently_licensed: vendor.not_currently_licensed,
          years_in_business: vendor.years_in_business,
          qualifications: vendor.qualifications,
        });
        break;
      case 'business':
        form.setFieldsValue({
          employee_count: vendor.employee_count,
          job_size_range: vendor.job_size_range,
          accepted_payments: vendor.accepted_payments,
          service_hours_weekdays: vendor.service_hours_weekdays,
          service_hours_weekends: vendor.service_hours_weekends,
          emergency_services: vendor.emergency_services,
        });
        break;
    }
  };

  const handleCancel = () => {
    setEditingSection(null);
    form.resetFields();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const response = await fetch('/api/vendor/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const { data } = await response.json();
        setVendor(data);
        setEditingSection(null);
        form.resetFields();
        message.success('Profile updated successfully');
      } else {
        const err = await response.json();
        message.error(err.message || 'Failed to update profile');
      }
    } catch {
      // Form validation error — handled by antd
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading profile...</div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <Alert
        type="error"
        message="Error Loading Profile"
        description={error || 'Could not load your profile'}
        showIcon
      />
    );
  }

  const getEmployeeCountLabel = (value: string | null) => {
    if (!value) return 'Not specified';
    const option = EMPLOYEE_COUNT_OPTIONS.find(o => o.value === value);
    return option?.label || value;
  };

  const getJobSizeLabels = (values: string[] | null) => {
    if (!values || values.length === 0) return 'Not specified';
    return values.map(v => {
      const option = JOB_SIZE_RANGE_OPTIONS.find(o => o.value === v);
      return option?.label || v;
    }).join(', ');
  };

  const getPaymentLabels = (values: string[] | null) => {
    if (!values || values.length === 0) return 'Not specified';
    return values.map(v => {
      const option = ACCEPTED_PAYMENTS_OPTIONS.find(o => o.value === v);
      return option?.label || v;
    }).join(', ');
  };

  const getContactPreferenceLabels = (prefs: string | null) => {
    if (!prefs) return 'Not specified';
    return prefs.split(', ').map(p => {
      return CONTACT_PREFERENCE_LABELS[p as ContactPreference] || p;
    }).join(', ');
  };

  const BooleanBadge = ({ value, trueText, falseText }: { value: boolean; trueText: string; falseText: string }) => (
    <Tag color={value ? 'success' : 'default'} icon={value ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
      {value ? trueText : falseText}
    </Tag>
  );

  const editButton = (section: EditSection) => (
    <Button
      type="text"
      icon={<EditOutlined />}
      onClick={() => handleEdit(section)}
      disabled={editingSection !== null && editingSection !== section}
    >
      Edit
    </Button>
  );

  const editActions = (
    <Space>
      <Button onClick={handleCancel}>Cancel</Button>
      <Button type="primary" onClick={handleSave} loading={saving}>Save</Button>
    </Space>
  );

  const serviceOptions = categories.map(c => ({ value: c.key, label: c.label }));
  const contactPrefOptions = Object.entries(CONTACT_PREFERENCE_LABELS).map(([value, label]) => ({ value, label }));

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>My Profile</Title>

      <Form form={form} layout="vertical">
        <Row gutter={[24, 24]}>
          {/* Contact Information */}
          <Col xs={24} lg={12}>
            <Card
              title={<Space><UserOutlined /><span>Contact Information</span></Space>}
              extra={editingSection === 'contact' ? editActions : editButton('contact')}
            >
              {editingSection === 'contact' ? (
                <>
                  <Form.Item label="Contact Name" name="contact_name" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Phone" name="phone">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Website" name="website">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Business Address" name="location">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Contact Preference" name="call_preferences">
                    <Select options={contactPrefOptions} allowClear />
                  </Form.Item>
                  <Divider>Social Media</Divider>
                  <Form.Item label="Instagram" name="social_instagram">
                    <Input prefix={<InstagramOutlined />} placeholder="@handle" />
                  </Form.Item>
                  <Form.Item label="Facebook" name="social_facebook">
                    <Input prefix={<FacebookOutlined />} placeholder="Page URL" />
                  </Form.Item>
                  <Form.Item label="LinkedIn" name="social_linkedin">
                    <Input prefix={<LinkedinOutlined />} placeholder="Profile URL" />
                  </Form.Item>
                </>
              ) : (
                <>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Business Name">
                      <Text strong>{vendor.business_name}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Contact Name">
                      {vendor.contact_name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Email">
                      <Space><MailOutlined />{vendor.email}</Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="Phone">
                      <Space><PhoneOutlined />{vendor.phone || 'Not provided'}</Space>
                    </Descriptions.Item>
                    {vendor.website && (
                      <Descriptions.Item label="Website">
                        <Space>
                          <GlobalOutlined />
                          <a href={vendor.website} target="_blank" rel="noopener noreferrer">{vendor.website}</a>
                        </Space>
                      </Descriptions.Item>
                    )}
                    {vendor.location && (
                      <Descriptions.Item label="Business Address">
                        <Space><EnvironmentOutlined />{vendor.location}</Space>
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label="Contact Preference">
                      {getContactPreferenceLabels(vendor.call_preferences)}
                    </Descriptions.Item>
                  </Descriptions>
                  {(vendor.social_instagram || vendor.social_facebook || vendor.social_linkedin) && (
                    <>
                      <Divider style={{ margin: '16px 0' }} />
                      <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Social Media</Text>
                      <Space wrap>
                        {vendor.social_instagram && (
                          <Tag icon={<InstagramOutlined />} color="magenta">{vendor.social_instagram}</Tag>
                        )}
                        {vendor.social_facebook && (
                          <Tag icon={<FacebookOutlined />} color="blue">{vendor.social_facebook}</Tag>
                        )}
                        {vendor.social_linkedin && (
                          <Tag icon={<LinkedinOutlined />} color="geekblue">{vendor.social_linkedin}</Tag>
                        )}
                      </Space>
                    </>
                  )}
                </>
              )}
            </Card>
          </Col>

          {/* Services & Coverage */}
          <Col xs={24} lg={12}>
            <Card
              title={<Space><SafetyCertificateOutlined /><span>Services & Coverage</span></Space>}
              extra={editingSection === 'services' ? editActions : editButton('services')}
            >
              {editingSection === 'services' ? (
                <>
                  <Form.Item label="Services Offered" name="services" rules={[{ required: true, message: 'Select at least one service' }]}>
                    <Select
                      mode="multiple"
                      options={serviceOptions}
                      showSearch
                      optionFilterProp="label"
                      placeholder="Select services"
                    />
                  </Form.Item>
                  <Form.Item label="Service Areas (Zip Codes)" name="service_areas">
                    <Select mode="tags" placeholder="Enter zip codes" />
                  </Form.Item>
                  <Form.Item label="Licensed Areas (Zip Codes)" name="licensed_areas">
                    <Select mode="tags" placeholder="Enter zip codes" />
                  </Form.Item>
                </>
              ) : (
                <>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Services Offered</Text>
                  <Space wrap style={{ marginBottom: 16 }}>
                    {vendor.services.map((service) => (
                      <Tag key={service} color="blue">{SERVICE_TYPE_LABELS[service] || service}</Tag>
                    ))}
                  </Space>

                  {vendor.service_specialties && Object.keys(vendor.service_specialties).length > 0 && (
                    <>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Service Specialties</Text>
                      <div style={{ marginBottom: 16 }}>
                        {Object.entries(vendor.service_specialties).map(([service, specialties]) => (
                          <div key={service} style={{ marginBottom: 8 }}>
                            <Text strong style={{ fontSize: 13 }}>
                              {SERVICE_TYPE_LABELS[service] || service}:
                            </Text>
                            <div style={{ marginTop: 4 }}>
                              <Space wrap size="small">
                                {(specialties as string[]).map((specialty: string) => (
                                  <Tag key={specialty}>{specialty}</Tag>
                                ))}
                              </Space>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Service Areas</Text>
                  <div style={{ marginBottom: 16 }}>
                    <ServiceAreaDisplay serviceAreas={vendor.service_areas} />
                  </div>

                  {vendor.licensed_areas && vendor.licensed_areas.length > 0 ? (
                    <>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Licensed In</Text>
                      <div style={{ marginBottom: 16 }}>
                        <ServiceAreaDisplay serviceAreas={vendor.licensed_areas} />
                      </div>
                    </>
                  ) : vendor.license_not_required ? (
                    <Text type="secondary" italic style={{ display: 'block', marginBottom: 16 }}>License not required for services provided</Text>
                  ) : vendor.not_currently_licensed ? (
                    <Text type="secondary" italic style={{ display: 'block', marginBottom: 16 }}>Not currently licensed</Text>
                  ) : null}
                </>
              )}
            </Card>
          </Col>

          {/* Qualifications */}
          <Col xs={24} lg={12}>
            <Card
              title={<Space><CheckCircleOutlined /><span>Qualifications</span></Space>}
              extra={editingSection === 'qualifications' ? editActions : editButton('qualifications')}
            >
              {editingSection === 'qualifications' ? (
                <>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Form.Item name="licensed" valuePropName="checked" style={{ marginBottom: 8 }}>
                      <Checkbox>Licensed</Checkbox>
                    </Form.Item>
                    <Form.Item name="insured" valuePropName="checked" style={{ marginBottom: 8 }}>
                      <Checkbox>Insured</Checkbox>
                    </Form.Item>
                    <Form.Item name="rental_experience" valuePropName="checked" style={{ marginBottom: 8 }}>
                      <Checkbox>Rental Property Experience</Checkbox>
                    </Form.Item>
                    <Form.Item name="license_not_required" valuePropName="checked" style={{ marginBottom: 8 }}>
                      <Checkbox>License Not Required</Checkbox>
                    </Form.Item>
                    <Form.Item name="not_currently_licensed" valuePropName="checked" style={{ marginBottom: 16 }}>
                      <Checkbox>Not Currently Licensed</Checkbox>
                    </Form.Item>
                  </Space>
                  <Form.Item label="Years in Business" name="years_in_business">
                    <InputNumber min={0} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item label="Experience & Qualifications" name="qualifications">
                    <Input.TextArea rows={4} />
                  </Form.Item>
                </>
              ) : (
                <>
                  <Space wrap style={{ marginBottom: 16 }}>
                    <BooleanBadge value={vendor.licensed} trueText="Licensed" falseText="Not Licensed" />
                    <BooleanBadge value={vendor.insured} trueText="Insured" falseText="Not Insured" />
                    <BooleanBadge value={vendor.rental_experience} trueText="Rental Experience" falseText="No Rental Experience" />
                  </Space>

                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Years in Business">
                      {vendor.years_in_business !== null ? `${vendor.years_in_business}+ years` : 'Not specified'}
                    </Descriptions.Item>
                  </Descriptions>

                  {vendor.qualifications && (
                    <>
                      <Text type="secondary" style={{ display: 'block', marginTop: 16, marginBottom: 8 }}>
                        Experience & Qualifications
                      </Text>
                      <div style={{ background: brandColors.background, padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap' }}>
                        {vendor.qualifications}
                      </div>
                    </>
                  )}
                </>
              )}
            </Card>
          </Col>

          {/* Business Details */}
          <Col xs={24} lg={12}>
            <Card
              title={<Space><TeamOutlined /><span>Business Details</span></Space>}
              extra={editingSection === 'business' ? editActions : editButton('business')}
            >
              {editingSection === 'business' ? (
                <>
                  <Form.Item label="Team Size" name="employee_count">
                    <Select
                      options={EMPLOYEE_COUNT_OPTIONS}
                      allowClear
                      placeholder="Select team size"
                    />
                  </Form.Item>
                  <Form.Item label="Job Sizes" name="job_size_range">
                    <Select
                      mode="multiple"
                      options={JOB_SIZE_RANGE_OPTIONS}
                      placeholder="Select job sizes"
                    />
                  </Form.Item>
                  <Form.Item label="Accepted Payments" name="accepted_payments">
                    <Select
                      mode="multiple"
                      options={ACCEPTED_PAYMENTS_OPTIONS}
                      placeholder="Select payment methods"
                    />
                  </Form.Item>
                  <Divider>Service Hours</Divider>
                  <Form.Item name="service_hours_weekdays" valuePropName="checked" style={{ marginBottom: 8 }}>
                    <Checkbox>Weekdays</Checkbox>
                  </Form.Item>
                  <Form.Item name="service_hours_weekends" valuePropName="checked" style={{ marginBottom: 8 }}>
                    <Checkbox>Weekends</Checkbox>
                  </Form.Item>
                  <Form.Item name="emergency_services" valuePropName="checked">
                    <Checkbox>24/7 Emergency Services</Checkbox>
                  </Form.Item>
                </>
              ) : (
                <>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Team Size">
                      {getEmployeeCountLabel(vendor.employee_count)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Job Sizes">
                      {getJobSizeLabels(vendor.job_size_range)}
                    </Descriptions.Item>
                  </Descriptions>

                  <Divider style={{ margin: '16px 0' }} />

                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    <ClockCircleOutlined style={{ marginRight: 8 }} />
                    Service Hours
                  </Text>
                  <Space wrap>
                    {vendor.service_hours_weekdays && <Tag color="green">Weekdays</Tag>}
                    {vendor.service_hours_weekends && <Tag color="green">Weekends</Tag>}
                    {vendor.emergency_services && <Tag color="red">24/7 Emergency</Tag>}
                    {!vendor.service_hours_weekdays && !vendor.service_hours_weekends && !vendor.emergency_services && (
                      <Text type="secondary">Not specified</Text>
                    )}
                  </Space>

                  <Divider style={{ margin: '16px 0' }} />

                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    <DollarOutlined style={{ marginRight: 8 }} />
                    Accepted Payments
                  </Text>
                  <Text>{getPaymentLabels(vendor.accepted_payments)}</Text>
                </>
              )}
            </Card>
          </Col>

          {/* Account Status (read-only) */}
          <Col xs={24}>
            <Card title="Account Status" size="small">
              <Space size="large" wrap>
                <div>
                  <Text type="secondary">Status: </Text>
                  <Tag color={vendor.status === 'active' ? 'success' : 'warning'}>
                    {vendor.status.toUpperCase()}
                  </Tag>
                </div>
                <div>
                  <Text type="secondary">Member Since: </Text>
                  <Text>{new Date(vendor.created_at).toLocaleDateString()}</Text>
                </div>
                <div>
                  <Text type="secondary">Terms Accepted: </Text>
                  {vendor.terms_accepted ? (
                    <Tag color="success" icon={<CheckCircleOutlined />}>Yes</Tag>
                  ) : (
                    <Tag color="warning" icon={<CloseCircleOutlined />}>No</Tag>
                  )}
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
}

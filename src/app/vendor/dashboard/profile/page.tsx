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
  InstagramOutlined,
  FacebookOutlined,
  LinkedinOutlined,
} from '@ant-design/icons';
import {
  Vendor,
  SERVICE_TYPE_LABELS,
  CONTACT_PREFERENCE_LABELS,
  EMPLOYEE_COUNT_OPTIONS,
  JOB_SIZE_RANGE_OPTIONS,
  ACCEPTED_PAYMENTS_OPTIONS,
} from '@/types/database';
import { brandColors } from '@/theme/config';
import ServiceAreaDisplay from '@/components/ServiceAreaDisplay';

const { Title, Text } = Typography;

export default function VendorProfilePage() {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      return CONTACT_PREFERENCE_LABELS[p as keyof typeof CONTACT_PREFERENCE_LABELS] || p;
    }).join(', ');
  };

  const BooleanBadge = ({ value, trueText, falseText }: { value: boolean; trueText: string; falseText: string }) => (
    <Tag color={value ? 'success' : 'default'} icon={value ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
      {value ? trueText : falseText}
    </Tag>
  );

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>My Profile</Title>

      <Row gutter={[24, 24]}>
        {/* Contact Information */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <UserOutlined />
                <span>Contact Information</span>
              </Space>
            }
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Business Name">
                <Text strong>{vendor.business_name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Contact Name">
                {vendor.contact_name}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                <Space>
                  <MailOutlined />
                  {vendor.email}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                <Space>
                  <PhoneOutlined />
                  {vendor.phone || 'Not provided'}
                </Space>
              </Descriptions.Item>
              {vendor.website && (
                <Descriptions.Item label="Website">
                  <Space>
                    <GlobalOutlined />
                    <a href={vendor.website} target="_blank" rel="noopener noreferrer">
                      {vendor.website}
                    </a>
                  </Space>
                </Descriptions.Item>
              )}
              {vendor.location && (
                <Descriptions.Item label="Business Address">
                  <Space>
                    <EnvironmentOutlined />
                    {vendor.location}
                  </Space>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Contact Preference">
                {getContactPreferenceLabels(vendor.call_preferences)}
              </Descriptions.Item>
            </Descriptions>

            {/* Social Media */}
            {(vendor.social_instagram || vendor.social_facebook || vendor.social_linkedin) && (
              <>
                <Divider style={{ margin: '16px 0' }} />
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Social Media</Text>
                <Space wrap>
                  {vendor.social_instagram && (
                    <Tag icon={<InstagramOutlined />} color="magenta">
                      {vendor.social_instagram}
                    </Tag>
                  )}
                  {vendor.social_facebook && (
                    <Tag icon={<FacebookOutlined />} color="blue">
                      {vendor.social_facebook}
                    </Tag>
                  )}
                  {vendor.social_linkedin && (
                    <Tag icon={<LinkedinOutlined />} color="geekblue">
                      {vendor.social_linkedin}
                    </Tag>
                  )}
                </Space>
              </>
            )}
          </Card>
        </Col>

        {/* Services & Coverage */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <SafetyCertificateOutlined />
                <span>Services & Coverage</span>
              </Space>
            }
          >
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Services Offered</Text>
            <Space wrap style={{ marginBottom: 16 }}>
              {vendor.services.map((service) => (
                <Tag key={service} color="blue">
                  {SERVICE_TYPE_LABELS[service] || service}
                </Tag>
              ))}
            </Space>

            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Service Areas</Text>
            <div style={{ marginBottom: 16 }}>
              <ServiceAreaDisplay serviceAreas={vendor.service_areas} />
            </div>

            {vendor.licensed_areas && vendor.licensed_areas.length > 0 && (
              <>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Licensed In</Text>
                <div style={{ marginBottom: 16 }}>
                  <ServiceAreaDisplay serviceAreas={vendor.licensed_areas} />
                </div>
              </>
            )}
          </Card>
        </Col>

        {/* Qualifications */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <CheckCircleOutlined />
                <span>Qualifications</span>
              </Space>
            }
          >
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
                <div
                  style={{
                    background: brandColors.background,
                    padding: 12,
                    borderRadius: 8,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {vendor.qualifications}
                </div>
              </>
            )}
          </Card>
        </Col>

        {/* Business Details */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <TeamOutlined />
                <span>Business Details</span>
              </Space>
            }
          >
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
          </Card>
        </Col>

        {/* Account Status */}
        <Col xs={24}>
          <Card
            title="Account Status"
            size="small"
          >
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
    </div>
  );
}

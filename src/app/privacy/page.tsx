'use client'

import { Layout, Typography, Divider } from 'antd'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import { brandColors } from '@/theme/config'

const { Content } = Layout
const { Title, Paragraph, Text } = Typography

export default function PrivacyPolicyPage() {
  return (
    <Layout style={{ minHeight: '100vh', background: brandColors.background }}>
      <PublicHeader showRequestButton={true} showSignIn={false} />

      <Content style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', background: brandColors.white, padding: 48, borderRadius: 16, boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)' }}>
          <Title level={1} style={{ color: brandColors.primary }}>Real Landlording LLC</Title>
          <Title level={2}>Privacy Policy</Title>
          <Text type="secondary" style={{ fontSize: 14 }}>Last Updated: February 2026</Text>

          <Divider />

          <Title level={3}>1. Who We Are</Title>
          <Paragraph>
            Real Landlording LLC (&quot;RL,&quot; &quot;we,&quot; &quot;us&quot;) operates a referral platform that connects landlords and property owners (&quot;Users&quot;) with independent third-party service providers (&quot;Vendors&quot;). This Privacy Policy describes how we collect, use, and protect your personal information.
          </Paragraph>

          <Divider />

          <Title level={3}>2. Information We Collect</Title>

          <Title level={4}>From Users (Landlords)</Title>
          <Paragraph>
            When you submit a service request or create an account, we may collect:
          </Paragraph>
          <ul>
            <li>Name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Property address or zip code</li>
            <li>Service request details (service type, job description, urgency, budget)</li>
          </ul>

          <Title level={4}>From Vendors</Title>
          <Paragraph>
            When you apply to join the platform, we may collect:
          </Paragraph>
          <ul>
            <li>Contact name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Business name and website</li>
            <li>Business location and service areas</li>
            <li>Services offered, qualifications, and experience</li>
            <li>Licensing and insurance information</li>
            <li>Portfolio media (photos/videos of past work)</li>
          </ul>

          <Divider />

          <Title level={3}>3. How We Use Your Information</Title>
          <Paragraph>
            We use your personal information solely to:
          </Paragraph>
          <ul>
            <li>Facilitate referrals and introductions between Users and Vendors</li>
            <li>Send service-related communications (e.g., request confirmations, vendor match notifications, follow-ups)</li>
            <li>Process and review vendor applications</li>
            <li>Operate, maintain, and improve the platform</li>
            <li>Respond to support requests</li>
          </ul>

          <Divider />

          <Title level={3}>4. Information Sharing</Title>
          <Paragraph>
            RL does <Text strong>not</Text> sell your personal data.
          </Paragraph>
          <Paragraph>
            RL does <Text strong>not</Text> share your personal information with third parties for marketing purposes.
          </Paragraph>
          <Paragraph>
            We share personal information <Text strong>only as necessary</Text> to facilitate referrals:
          </Paragraph>
          <ul>
            <li>User contact information (name, phone, email) may be shared with matched Vendors to facilitate a service introduction</li>
            <li>Vendor contact and business information may be shared with Users as part of a referral match</li>
          </ul>
          <Paragraph>
            We may also disclose information if required by law or to protect the rights and safety of RL, our users, or others.
          </Paragraph>

          <Divider />

          <Title level={3}>5. Email Communications</Title>
          <Paragraph>
            By using the platform, you may receive:
          </Paragraph>
          <ul>
            <li>Service-related emails (e.g., referral confirmations, follow-ups, application status updates)</li>
            <li>Informational and educational communications, including newsletters</li>
          </ul>
          <Paragraph>
            You may unsubscribe from marketing or newsletter emails at any time using the &quot;unsubscribe&quot; link. Unsubscribing from marketing emails does <Text strong>not</Text> affect service-related communications or platform access.
          </Paragraph>

          <Divider />

          <Title level={3}>6. SMS/Text Message Communications</Title>
          <Paragraph>
            By providing a phone number on our platform, you expressly consent to receive SMS/text messages from Real Landlording LLC. The types of messages you may receive depend on your role:
          </Paragraph>

          <Title level={4}>For Users (Landlords)</Title>
          <ul>
            <li>Request confirmations and status updates</li>
            <li>Vendor match notifications</li>
            <li>Follow-up messages regarding service quality</li>
            <li>Important platform notifications</li>
          </ul>

          <Title level={4}>For Vendors</Title>
          <ul>
            <li>New referral notifications</li>
            <li>Application status updates</li>
            <li>Platform announcements</li>
            <li>Important account notifications</li>
          </ul>

          <Paragraph>
            Message frequency varies based on your activity on the platform. Message and data rates may apply.
          </Paragraph>
          <Paragraph>
            Text <Text strong>STOP</Text> to any message to opt out of SMS communications. Text <Text strong>HELP</Text> for support, or contact us at support@reallandlording.com. Opting out of SMS does <Text strong>not</Text> affect email communications or platform access.
          </Paragraph>

          <Divider />

          <Title level={3}>7. Data Security</Title>
          <Paragraph>
            We implement reasonable administrative, technical, and physical safeguards to protect your personal information. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
          </Paragraph>

          <Divider />

          <Title level={3}>8. Data Retention</Title>
          <Paragraph>
            We retain your personal information for as long as necessary to provide our services and fulfill the purposes described in this policy. You may request deletion of your account and associated data by contacting us at support@reallandlording.com.
          </Paragraph>

          <Divider />

          <Title level={3}>9. Your Rights</Title>
          <Paragraph>
            You may:
          </Paragraph>
          <ul>
            <li>Request access to the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your data</li>
            <li>Opt out of SMS communications by texting <Text strong>STOP</Text></li>
            <li>Opt out of marketing emails via the unsubscribe link</li>
          </ul>
          <Paragraph>
            To exercise these rights, contact us at support@reallandlording.com.
          </Paragraph>

          <Divider />

          <Title level={3}>10. Changes to This Policy</Title>
          <Paragraph>
            We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated &quot;Last Updated&quot; date. Continued use of the platform after changes constitutes acceptance of the revised policy.
          </Paragraph>

          <Divider />

          <Title level={3}>11. Contact Us</Title>
          <Paragraph>
            If you have questions about this Privacy Policy or our data practices, contact us at:
          </Paragraph>
          <Paragraph>
            Real Landlording LLC<br />
            Email: support@reallandlording.com
          </Paragraph>
        </div>
      </Content>

      <PublicFooter />
    </Layout>
  )
}

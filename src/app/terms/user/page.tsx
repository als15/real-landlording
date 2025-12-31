'use client'

import { Layout, Typography, Divider } from 'antd'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import { brandColors } from '@/theme/config'

const { Content } = Layout
const { Title, Paragraph, Text } = Typography

export default function UserTermsPage() {
  return (
    <Layout style={{ minHeight: '100vh', background: brandColors.background }}>
      <PublicHeader showRequestButton={true} showSignIn={false} />

      <Content style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', background: brandColors.white, padding: 48, borderRadius: 16, boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)' }}>
          <Title level={1} style={{ color: brandColors.primary }}>Real Landlording</Title>
          <Title level={2}>Terms of Service & Privacy Policy</Title>
          <Text type="secondary" style={{ fontSize: 16 }}>For Landlords / Users (Matching & Referrals)</Text>

          <Divider />

          <Title level={3}>1. Scope of Services</Title>
          <Paragraph>
            Real Landlording LLC (&quot;RL,&quot; &quot;we,&quot; &quot;us&quot;) operates a platform that facilitates introductions between landlords/property owners (&quot;Users&quot;) and independent third-party service providers (&quot;Vendors&quot;).
          </Paragraph>
          <Paragraph>
            RL <Text strong>does not perform, supervise, manage, guarantee, or warrant</Text> any services provided by Vendors. RL&apos;s role is strictly limited to <Text strong>referrals and informational support</Text>.
          </Paragraph>

          <Divider />

          <Title level={3}>2. No Professional Advice</Title>
          <Paragraph>
            Any information, tools, calculators, content, recommendations, or guidance provided through the platform are for <Text strong>general informational purposes only</Text>.
          </Paragraph>
          <Paragraph>
            RL does <Text strong>not</Text> provide legal, financial, construction, tax, engineering, or professional advice. Users are solely responsible for evaluating Vendors and making independent decisions.
          </Paragraph>

          <Divider />

          <Title level={3}>3. Vendor Relationship Disclaimer</Title>
          <Paragraph>
            Vendors are <Text strong>independent third parties</Text>, not employees, agents, partners, or representatives of RL.
          </Paragraph>
          <Paragraph>
            RL does not control:
          </Paragraph>
          <ul>
            <li>pricing</li>
            <li>scope of work</li>
            <li>workmanship</li>
            <li>timelines</li>
            <li>warranties</li>
            <li>compliance</li>
            <li>licensing</li>
            <li>insurance</li>
            <li>dispute resolution</li>
          </ul>
          <Paragraph>
            All contracts, payments, and obligations are <Text strong>directly between User and Vendor</Text>.
          </Paragraph>

          <Divider />

          <Title level={3}>4. Assumption of Risk</Title>
          <Paragraph>
            By using the platform, Users acknowledge and accept that:
          </Paragraph>
          <ul>
            <li>construction, repairs, inspections, and property services involve inherent risks</li>
            <li>RL cannot eliminate or control those risks</li>
            <li>Users assume full responsibility for engaging Vendors</li>
          </ul>

          <Divider />

          <Title level={3}>5. Limitation of Liability</Title>
          <Paragraph>
            To the maximum extent permitted by law:
          </Paragraph>
          <ul>
            <li>RL shall not be liable for any damages arising from Vendor services, including property damage, personal injury, delays, losses, regulatory issues, or financial harm.</li>
            <li>RL&apos;s total liability, if any, shall not exceed <Text strong>the amount paid by the User to RL (if any)</Text> related to the referral giving rise to the claim.</li>
          </ul>
          <Paragraph>
            RL shall not be liable for indirect, incidental, consequential, punitive, or special damages.
          </Paragraph>

          <Divider />

          <Title level={3}>6. Indemnification</Title>
          <Paragraph>
            User agrees to indemnify and hold harmless RL from any claims, damages, losses, or disputes arising out of:
          </Paragraph>
          <ul>
            <li>Vendor services</li>
            <li>User-Vendor agreements</li>
            <li>User actions or omissions</li>
            <li>violations of law or regulation</li>
          </ul>

          <Divider />

          <Title level={3}>7. No Guarantee of Outcomes</Title>
          <Paragraph>
            RL makes <Text strong>no guarantees</Text> regarding:
          </Paragraph>
          <ul>
            <li>Vendor availability</li>
            <li>quality of work</li>
            <li>pricing</li>
            <li>timelines</li>
            <li>savings</li>
            <li>regulatory outcomes</li>
            <li>inspection or compliance results</li>
          </ul>

          <Divider />

          <Title level={3}>8. Data & Privacy</Title>
          <Paragraph>
            RL collects and uses personal data solely to:
          </Paragraph>
          <ul>
            <li>facilitate referrals</li>
            <li>communicate platform activity</li>
            <li>improve services</li>
          </ul>
          <Paragraph>
            RL does not sell personal data. Information may be shared with Vendors <Text strong>only as necessary</Text> to facilitate a referral.
          </Paragraph>
          <Paragraph>
            Users are responsible for the accuracy of information submitted.
          </Paragraph>

          <Divider />

          <Title level={3}>9. Dispute Resolution</Title>
          <Paragraph>
            RL is not responsible for resolving disputes between Users and Vendors. Any disputes must be handled directly between those parties.
          </Paragraph>

          <Divider />

          <Title level={3}>10. Governing Law</Title>
          <Paragraph>
            These Terms are governed by the laws of the Commonwealth of Pennsylvania.
          </Paragraph>

          <Divider />

          <Title level={3}>11. Acceptance</Title>
          <Paragraph>
            By submitting a request or using the platform, User agrees to these Terms & Privacy Policy.
          </Paragraph>
        </div>
      </Content>

      <PublicFooter />
    </Layout>
  )
}

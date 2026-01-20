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
          <Title level={1} style={{ color: brandColors.primary }}>Real Landlording LLC</Title>
          <Title level={2}>Terms of Service & Privacy Policy</Title>
          <Text type="secondary" style={{ fontSize: 16 }}>For Landlords / Users (Matching & Referrals)</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 14 }}>Last Updated: January 2026</Text>

          <Divider />

          <Title level={3}>1. Scope of Services</Title>
          <Paragraph>
            Real Landlording LLC (&quot;RL,&quot; &quot;we,&quot; &quot;us&quot;) operates a referral and information platform that facilitates introductions between landlords and property owners (&quot;Users&quot;) and independent third-party service providers (&quot;Vendors&quot;).
          </Paragraph>
          <Paragraph>
            RL does <Text strong>not</Text> perform, supervise, manage, control, guarantee, or warrant any services provided by Vendors. RL&apos;s role is strictly limited to facilitating referrals and providing general informational support.
          </Paragraph>

          <Divider />

          <Title level={3}>2. No Professional Advice</Title>
          <Paragraph>
            Any information, tools, calculators, content, recommendations, diagnostics, or guidance provided through the platform are for <Text strong>general informational purposes only</Text>.
          </Paragraph>
          <Paragraph>
            RL does <Text strong>not</Text> provide legal, financial, tax, construction, engineering, insurance, or professional advice. Users are solely responsible for:
          </Paragraph>
          <ul>
            <li>evaluating Vendors</li>
            <li>conducting due diligence</li>
            <li>determining suitability of services</li>
            <li>making independent decisions</li>
          </ul>
          <Paragraph>
            Users are encouraged to consult qualified professionals before making decisions.
          </Paragraph>

          <Divider />

          <Title level={3}>3. Vendor Relationship Disclaimer</Title>
          <Paragraph>
            Vendors are independent third parties and are <Text strong>not</Text> employees, agents, partners, joint venturers, or representatives of RL.
          </Paragraph>
          <Paragraph>
            RL does not control or assume responsibility for:
          </Paragraph>
          <ul>
            <li>pricing</li>
            <li>scope of work</li>
            <li>workmanship</li>
            <li>timelines</li>
            <li>warranties</li>
            <li>permits, licensing, or insurance</li>
            <li>compliance with laws</li>
            <li>dispute resolution</li>
          </ul>
          <Paragraph>
            All agreements, payments, and obligations are strictly between User and Vendor.
          </Paragraph>

          <Divider />

          <Title level={3}>4. Assumption of Risk</Title>
          <Paragraph>
            By using the platform, Users acknowledge and accept that:
          </Paragraph>
          <ul>
            <li>property-related services involve inherent risks</li>
            <li>RL cannot eliminate or control those risks</li>
            <li>Users assume full responsibility for selecting, engaging, and contracting with Vendors</li>
          </ul>

          <Divider />

          <Title level={3}>5. Limitation of Liability</Title>
          <Paragraph>
            To the maximum extent permitted by law:
          </Paragraph>
          <ul>
            <li>RL shall not be liable for any damages arising from Vendor services, including property damage, personal injury, delays, losses, regulatory issues, or financial harm.</li>
            <li>RL&apos;s total liability, if any, shall not exceed the amount paid by the User to RL (if any) related to the referral giving rise to the claim.</li>
            <li>RL shall not be liable for indirect, incidental, consequential, punitive, or special damages.</li>
          </ul>

          <Divider />

          <Title level={3}>6. Indemnification</Title>
          <Paragraph>
            User agrees to indemnify, defend, and hold harmless RL from any claims, damages, losses, costs, or disputes arising out of:
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
            RL makes no guarantees regarding:
          </Paragraph>
          <ul>
            <li>Vendor availability</li>
            <li>quality of work</li>
            <li>pricing or cost savings</li>
            <li>timelines</li>
            <li>regulatory, inspection, or compliance outcomes</li>
            <li>financial or investment results</li>
          </ul>

          <Divider />

          <Title level={3}>8. Data, Privacy & Communications</Title>

          <Title level={4}>Data Use</Title>
          <Paragraph>
            RL collects and uses personal data solely to:
          </Paragraph>
          <ul>
            <li>facilitate referrals</li>
            <li>communicate platform-related activity</li>
            <li>improve services</li>
          </ul>
          <Paragraph>
            RL does <Text strong>not</Text> sell personal data. Information may be shared with Vendors <Text strong>only as necessary</Text> to facilitate a referral. Users are responsible for the accuracy of information submitted.
          </Paragraph>

          <Title level={4}>Communications & Newsletter</Title>
          <Paragraph>
            By submitting a request or using the platform, Users acknowledge and agree that RL may send:
          </Paragraph>
          <ul>
            <li>service-related communications (e.g. referral confirmations, follow-ups)</li>
            <li>informational and educational communications, including newsletters</li>
          </ul>
          <Paragraph>
            Users may unsubscribe from marketing or newsletter emails at any time using the &quot;unsubscribe&quot; link. Unsubscribing from marketing emails does <Text strong>not</Text> affect access to core platform functionality or service-related communications.
          </Paragraph>

          <Divider />

          <Title level={3}>9. Dispute Resolution</Title>
          <Paragraph>
            RL is not responsible for resolving disputes between Users and Vendors. Any disputes must be handled directly between those parties.
          </Paragraph>

          <Divider />

          <Title level={3}>10. Governing Law</Title>
          <Paragraph>
            These Terms are governed by the laws of the Commonwealth of Pennsylvania, without regard to conflict-of-law principles.
          </Paragraph>

          <Divider />

          <Title level={3}>11. Acceptance</Title>
          <Paragraph>
            By submitting a request, checking the acceptance box, or using the platform, User acknowledges that they have read, understood, and agree to these Terms of Service & Privacy Policy.
          </Paragraph>

          <Divider />

          <Title level={3}>12. Vendor Documentation Disclaimer</Title>
          <Paragraph>
            Real Landlording LLC may collect, store, or review certain vendor documentation, including but not limited to insurance certificates, licenses, or certifications, solely for internal platform and operational purposes.
          </Paragraph>
          <Paragraph>
            Users expressly acknowledge and agree that:
          </Paragraph>
          <ul>
            <li>Any vendor documentation collected or reviewed by Real Landlording is <Text strong>not</Text> provided for User reliance</li>
            <li>Real Landlording does <Text strong>not</Text> verify, audit, guarantee, monitor, or continuously update the accuracy, validity, scope, or sufficiency of any vendor&apos;s insurance, licensing, or certifications</li>
            <li>The existence, display, or mention of vendor documentation does <Text strong>not</Text> constitute an endorsement, approval, warranty, or representation by Real Landlording</li>
            <li>Vendors may experience changes, lapses, exclusions, or cancellations in coverage at any time without notice to Real Landlording</li>
          </ul>
          <Paragraph>
            Users are <Text strong>solely responsible</Text> for conducting their own independent due diligence, including requesting and verifying current insurance coverage, licenses, certifications, and qualifications directly with the Vendor before engaging any services.
          </Paragraph>
          <Paragraph>
            Real Landlording assumes no liability for any loss, damage, claim, or dispute arising from a User&apos;s reliance on vendor documentation, whether reviewed, collected, or referenced by Real Landlording.
          </Paragraph>
        </div>
      </Content>

      <PublicFooter />
    </Layout>
  )
}

'use client'

import { Layout, Typography, Divider } from 'antd'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import { brandColors } from '@/theme/config'

const { Content } = Layout
const { Title, Paragraph, Text } = Typography

export default function VendorTermsPage() {
  return (
    <Layout style={{ minHeight: '100vh', background: brandColors.background }}>
      <PublicHeader showRequestButton={true} showSignIn={false} />

      <Content style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', background: brandColors.white, padding: 48, borderRadius: 16, boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)' }}>
          <Title level={1} style={{ color: brandColors.primary }}>Real Landlording</Title>
          <Title level={2}>Vendor Terms of Service & Privacy Policy</Title>
          <Text type="secondary" style={{ fontSize: 16 }}>(Onboarding, Referrals & Fees)</Text>

          <Divider />

          <Title level={3}>1. Relationship</Title>
          <Paragraph>
            Vendor is an <Text strong>independent contractor</Text>. Nothing herein creates an employment, agency, partnership, or joint venture.
          </Paragraph>
          <Paragraph>
            RL is a <Text strong>referral platform only</Text>.
          </Paragraph>

          <Divider />

          <Title level={3}>2. Referral Role & No Guarantees</Title>
          <Paragraph>
            RL may introduce Vendors to potential clients. RL makes no guarantees regarding:
          </Paragraph>
          <ul>
            <li>referral volume</li>
            <li>job size</li>
            <li>job quality</li>
            <li>client behavior</li>
            <li>revenue</li>
          </ul>
          <Paragraph>
            All business decisions remain solely with Vendor.
          </Paragraph>

          <Divider />

          <Title level={3}>3. Vendor Responsibility</Title>
          <Paragraph>
            Vendor is solely responsible for:
          </Paragraph>
          <ul>
            <li>all services performed</li>
            <li>pricing and contracts</li>
            <li>workmanship</li>
            <li>warranties</li>
            <li>employees and subcontractors</li>
            <li>licenses, permits, and certifications</li>
            <li>insurance coverage</li>
            <li>compliance with all laws</li>
          </ul>

          <Divider />

          <Title level={3}>4. Reporting & Payment Transparency</Title>
          <Paragraph>
            Vendor agrees to:
          </Paragraph>
          <ul>
            <li>truthfully report all referred work</li>
            <li>accurately report invoice amounts and payments received</li>
            <li>pay referral fees as agreed</li>
            <li>provide documentation upon request</li>
          </ul>
          <Paragraph>
            Failure to report or misrepresentation constitutes a material breach.
          </Paragraph>

          <Divider />

          <Title level={3}>5. Fees & Payments</Title>
          <Paragraph>
            Referral fees are governed by the Referral Agreement and Addendum.
          </Paragraph>
          <Paragraph>
            Fees are calculated based on <Text strong>amounts actually received</Text>, regardless of job completion.
          </Paragraph>

          <Divider />

          <Title level={3}>6. No Circumvention</Title>
          <Paragraph>
            Vendor shall not attempt to bypass RL to avoid referral fees, including indirect arrangements or delayed billing.
          </Paragraph>

          <Divider />

          <Title level={3}>7. Limitation of Liability</Title>
          <Paragraph>
            RL shall not be liable for:
          </Paragraph>
          <ul>
            <li>Vendor&apos;s work</li>
            <li>client disputes</li>
            <li>payment issues</li>
            <li>damages of any kind</li>
          </ul>
          <Paragraph>
            RL&apos;s maximum liability shall not exceed <Text strong>referral fees actually received</Text> for the applicable referral.
          </Paragraph>

          <Divider />

          <Title level={3}>8. Indemnification</Title>
          <Paragraph>
            Vendor agrees to indemnify and hold harmless RL from any claims, damages, losses, regulatory actions, or disputes arising from:
          </Paragraph>
          <ul>
            <li>Vendor services</li>
            <li>Vendor representations</li>
            <li>client claims</li>
            <li>regulatory or compliance issues</li>
          </ul>

          <Divider />

          <Title level={3}>9. Data & Privacy</Title>
          <Paragraph>
            Vendor data is used for:
          </Paragraph>
          <ul>
            <li>onboarding</li>
            <li>vetting</li>
            <li>referral facilitation</li>
            <li>platform operations</li>
          </ul>
          <Paragraph>
            RL may share Vendor information with Users to facilitate referrals.
          </Paragraph>

          <Divider />

          <Title level={3}>10. Suspension & Termination</Title>
          <Paragraph>
            RL reserves the right to:
          </Paragraph>
          <ul>
            <li>suspend or remove Vendors</li>
            <li>pause referrals</li>
            <li>terminate participation at its sole discretion for quality, compliance, non-payment, or reporting issues.</li>
          </ul>

          <Divider />

          <Title level={3}>11. Governing Law</Title>
          <Paragraph>
            These Terms are governed by the laws of the Commonwealth of Pennsylvania.
          </Paragraph>

          <Divider />

          <Title level={3}>12. Service Standards & Responsiveness</Title>
          <Paragraph>
            Vendor agrees to conduct its business in a professional, timely, and commercially reasonable manner when engaging with clients referred by Real Landlording. Vendor shall make reasonable efforts to respond to referral inquiries within <Text strong>twenty-four (24) hours</Text> of receipt, unless otherwise agreed in writing or prevented by circumstances beyond Vendor&apos;s control.
          </Paragraph>
          <Paragraph>
            Vendor acknowledges that maintaining responsiveness, professionalism, and service quality is essential to the integrity of the Real Landlording platform and community. Failure to meet reasonable service standards, including repeated failure to respond to referrals in a timely manner, may result in reduced referrals, suspension, or removal from the platform, at Real Landlording&apos;s sole discretion.
          </Paragraph>
          <Paragraph>
            Vendor further acknowledges and agrees that referral fees may be charged for successful jobs in accordance with the Referral Agreement and applicable Referral Fee Addendum.
          </Paragraph>

          <Divider />

          <Title level={3}>13. Acceptance</Title>
          <Paragraph>
            By submitting an onboarding request or accepting referrals, Vendor agrees to these Terms & Privacy Policy.
          </Paragraph>
        </div>
      </Content>

      <PublicFooter />
    </Layout>
  )
}

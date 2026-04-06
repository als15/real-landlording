import { Suspense } from 'react';

const ACTION_MESSAGES: Record<string, string> = {
  booked: "Great news! We've noted that the job is booked. We'll send you a quick follow-up about the timeline.",
  discussing: "Thanks for the update! We'll check back in a few days to see how things are progressing.",
  cant_reach: "We'll reach out to the landlord to confirm and get things back on track.",
  no_deal: "Thanks for letting us know. We'll follow up with the landlord about finding another match.",
  contact_ok: "Good to hear! We'll continue monitoring the connection to make sure things go smoothly.",
  no_contact: "Sorry to hear that. We'll look into this and work on finding you a better match.",
  completed: "Congratulations on completing the project! We'll send you a quick follow-up about the invoice.",
  in_progress: "Thanks for the update! We'll send you a quick question about the new timeline.",
  cancelled: "We've noted the cancellation. We'll send you a quick follow-up question.",
  // Timeline responses
  timeline_1_2_days: "Got it — we'll check back in about a week. Good luck with the project!",
  timeline_3_5_days: "Got it — we'll check back in about two weeks. Good luck with the project!",
  timeline_1_2_weeks: "Got it — we'll check back in about three weeks. Good luck with the project!",
  timeline_longer: "Got it — we'll check back in about five weeks. Good luck with the project!",
  // Invoice responses
  invoice_under_500: "Thanks for sharing the invoice details! We'll send the landlord a feedback request.",
  invoice_500_1000: "Thanks for sharing the invoice details! We'll send the landlord a feedback request.",
  invoice_1000_2500: "Thanks for sharing the invoice details! We'll send the landlord a feedback request.",
  invoice_2500_5000: "Thanks for sharing the invoice details! We'll send the landlord a feedback request.",
  invoice_5000_plus: "Thanks for sharing the invoice details! We'll send the landlord a feedback request.",
  // Cancellation reason responses
  cancel_reason_price: "Thanks for the feedback. We'll use this to improve our matching.",
  cancel_reason_scope: "Thanks for the feedback. We'll use this to improve our matching.",
  cancel_reason_other_vendor: "Thanks for letting us know. We'll offer the landlord a rematch.",
  cancel_reason_other: "Thanks for the feedback. We'll use this to improve our matching.",
  // Feedback responses
  feedback_great: "Glad to hear it went well! Thanks for your feedback.",
  feedback_ok: "Thanks for your feedback! We'll keep working to improve our matches.",
  feedback_not_good: "Sorry to hear that. Your feedback helps us hold vendors accountable and improve.",
};

function ThanksContent({ action }: { action: string | null }) {
  const message = action ? ACTION_MESSAGES[action] : null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
      <div style={{ maxWidth: 500, padding: 40, background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
        <h1 style={{ margin: '0 0 12px', fontSize: 24, color: '#333' }}>Thank You!</h1>
        <p style={{ color: '#666', fontSize: 16, lineHeight: 1.6 }}>
          Your response has been recorded.
        </p>
        {message && (
          <p style={{ color: '#555', fontSize: 15, lineHeight: 1.6, marginTop: 16, padding: '12px 16px', background: '#f0f7ff', borderRadius: 8 }}>
            {message}
          </p>
        )}
        <p style={{ color: '#888', fontSize: 13, marginTop: 24 }}>
          You can close this page. Questions? Email us at support@reallandlording.com
        </p>
      </div>
    </div>
  );
}

// Server component wrapper that reads searchParams
export default async function ThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const params = await searchParams;
  return (
    <Suspense>
      <ThanksContent action={params.action || null} />
    </Suspense>
  );
}

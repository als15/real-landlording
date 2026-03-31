'use client';

import { useState, useEffect } from 'react';
import { Modal, Rate, Input, Space, Divider, Typography } from 'antd';
import { RequestVendorMatch, Vendor } from '@/types/database';
import { useNotify } from '@/hooks/useNotify';

const { Text } = Typography;
const { TextArea } = Input;

interface ReviewModalProps {
  open: boolean;
  onClose: () => void;
  match: (RequestVendorMatch & { vendor: Vendor }) | null;
  onSuccess: () => void;
}

export default function ReviewModal({ open, onClose, match, onSuccess }: ReviewModalProps) {
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewQuality, setReviewQuality] = useState(0);
  const [reviewPrice, setReviewPrice] = useState(0);
  const [reviewTimeline, setReviewTimeline] = useState(0);
  const [reviewTreatment, setReviewTreatment] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { message } = useNotify();

  useEffect(() => {
    if (match) {
      setReviewRating(match.review_rating || 0);
      setReviewQuality(match.review_quality || 0);
      setReviewPrice(match.review_price || 0);
      setReviewTimeline(match.review_timeline || 0);
      setReviewTreatment(match.review_treatment || 0);
      setReviewText(match.review_text || '');
    }
  }, [match]);

  const handleSubmit = async () => {
    if (!match || !reviewRating) {
      message.error('Please select an overall rating');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/landlord/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: match.id,
          rating: reviewRating,
          quality: reviewQuality || null,
          price: reviewPrice || null,
          timeline: reviewTimeline || null,
          treatment: reviewTreatment || null,
          review_text: reviewText,
        }),
      });

      if (response.ok) {
        message.success('Review submitted successfully!');
        onClose();
        onSuccess();
      } else {
        throw new Error('Failed to submit review');
      }
    } catch {
      message.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Review ${match?.vendor.business_name}`}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText="Submit Review"
      width={500}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Text strong>Overall Rating *</Text>
          <div style={{ marginTop: 8 }}>
            <Rate value={reviewRating} onChange={setReviewRating} style={{ fontSize: 28 }} />
          </div>
        </div>

        <Divider style={{ margin: '12px 0' }}>Rate Specific Areas (Optional)</Divider>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Text type="secondary" style={{ fontSize: 13 }}>Quality of Work</Text>
            <div style={{ marginTop: 4 }}>
              <Rate value={reviewQuality} onChange={setReviewQuality} style={{ fontSize: 18 }} />
            </div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 13 }}>Price / Value</Text>
            <div style={{ marginTop: 4 }}>
              <Rate value={reviewPrice} onChange={setReviewPrice} style={{ fontSize: 18 }} />
            </div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 13 }}>Timeliness</Text>
            <div style={{ marginTop: 4 }}>
              <Rate value={reviewTimeline} onChange={setReviewTimeline} style={{ fontSize: 18 }} />
            </div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 13 }}>Professionalism</Text>
            <div style={{ marginTop: 4 }}>
              <Rate value={reviewTreatment} onChange={setReviewTreatment} style={{ fontSize: 18 }} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>Additional Comments (optional)</Text>
          <TextArea
            rows={3}
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share any additional feedback about your experience..."
            style={{ marginTop: 8 }}
          />
        </div>
      </Space>
    </Modal>
  );
}

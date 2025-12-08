'use client';

import { Collapse, Typography } from 'antd';

const { Title } = Typography;

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  items?: FAQItem[];
  title?: string;
}

const defaultFAQItems: FAQItem[] = [
  {
    question: 'How are vendors selected?',
    answer:
      'All vendors in our network are vetted for experience with rental properties, proper licensing, and insurance. We check references and prioritize contractors who understand the unique needs of landlords and property managers.',
  },
  {
    question: 'How quickly will I hear back?',
    answer:
      'Most requests receive vendor matches within 24-48 hours. For emergency requests, we prioritize faster matching. You\'ll receive an email with your matched vendors and their contact information.',
  },
  {
    question: 'Is there a fee for using this service?',
    answer:
      'Submitting a request is completely free for landlords. There\'s no membership or subscription required. We earn a small referral fee from vendors for successful jobs, which doesn\'t affect your pricing.',
  },
  {
    question: 'What if I\'m not satisfied with the vendors?',
    answer:
      'If the matched vendors don\'t meet your needs, let us know and we\'ll work to find better alternatives. Your satisfaction is our priority, and we use your feedback to improve our vendor network.',
  },
];

export default function FAQ({ items = defaultFAQItems, title = 'Frequently Asked Questions' }: FAQProps) {
  const collapseItems = items.map((item, index) => ({
    key: String(index),
    label: item.question,
    children: <p style={{ margin: 0 }}>{item.answer}</p>,
  }));

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        {title}
      </Title>
      <Collapse
        items={collapseItems}
        bordered={false}
        style={{ background: 'transparent' }}
      />
    </div>
  );
}

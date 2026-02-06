'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Popover,
  Badge,
  Button,
  List,
  Typography,
  Space,
  Empty,
  Spin,
  Divider,
  Tag,
} from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  SolutionOutlined,
  StarOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Notification, NotificationType, NotificationPriority } from '@/types/database';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text, Link } = Typography;

// Icons for different notification types
const notificationIcons: Partial<Record<NotificationType, React.ReactNode>> = {
  new_request: <FileTextOutlined style={{ color: '#1890ff' }} />,
  emergency_request: <ThunderboltOutlined style={{ color: '#ff4d4f' }} />,
  stale_request: <ClockCircleOutlined style={{ color: '#faad14' }} />,
  new_application: <SolutionOutlined style={{ color: '#52c41a' }} />,
  vendor_accepted: <CheckOutlined style={{ color: '#52c41a' }} />,
  vendor_declined: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
  new_review: <StarOutlined style={{ color: '#1890ff' }} />,
  negative_review: <StarOutlined style={{ color: '#ff4d4f' }} />,
};

// Priority colors
const priorityColors: Record<NotificationPriority, string> = {
  low: '#52c41a',
  medium: '#faad14',
  high: '#ff4d4f',
};

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/unread-count');
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications?limit=10');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data || []);
        setUnreadCount(data.data?.filter((n: Notification) => !n.read).length || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await fetch(`/api/notifications/${notification.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ read: true }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Navigate if action URL exists
    if (notification.action_url) {
      setOpen(false);
      router.push(notification.action_url);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read_all' }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const content = (
    <div style={{ width: 380, maxHeight: 480, overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text strong style={{ fontSize: 16 }}>
          Notifications
        </Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notification List */}
      <div style={{ maxHeight: 380, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Spin />
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No notifications"
            style={{ padding: 40 }}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(notification) => (
              <List.Item
                onClick={() => handleNotificationClick(notification)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: notification.read ? 'transparent' : '#f6ffed',
                  borderBottom: '1px solid #f0f0f0',
                }}
                className="notification-item"
              >
                <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                  {/* Priority indicator */}
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: priorityColors[notification.priority],
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />

                  {/* Icon */}
                  <div style={{ fontSize: 18, flexShrink: 0 }}>
                    {notificationIcons[notification.type] || <BellOutlined />}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <Text
                        strong={!notification.read}
                        style={{
                          fontSize: 13,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {notification.title}
                      </Text>
                      <Text
                        type="secondary"
                        style={{ fontSize: 11, flexShrink: 0 }}
                      >
                        {dayjs(notification.created_at).fromNow()}
                      </Text>
                    </div>
                    <Text
                      type="secondary"
                      style={{
                        fontSize: 12,
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {notification.message}
                    </Text>
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Divider style={{ margin: 0 }} />
          <div style={{ padding: '8px 16px', textAlign: 'center' }}>
            <Link
              onClick={() => {
                setOpen(false);
                router.push('/notifications');
              }}
            >
              View all notifications
            </Link>
          </div>
        </>
      )}

      {/* Hover styles */}
      <style jsx global>{`
        .notification-item:hover {
          background-color: #fafafa !important;
        }
      `}</style>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      arrow={false}
      overlayInnerStyle={{ padding: 0 }}
    >
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        />
      </Badge>
    </Popover>
  );
}

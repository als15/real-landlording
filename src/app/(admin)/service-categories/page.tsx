'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Typography,
  Button,
  Space,
  Table,
  Tag,
  Switch,
  Modal,
  Form,
  Input,
  Select,
  Collapse,
  Card,
  Popconfirm,
  Spin,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useNotify } from '@/hooks/useNotify';
import type { ServiceClassification } from '@/types/database';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryWithCounts {
  id: string;
  key: string;
  label: string;
  group_key: string;
  sort_order: number;
  is_active: boolean;
  classifications: ServiceClassification[];
  emergency_enabled: boolean;
  finish_level_enabled: boolean;
  external_link: boolean;
  external_url: string | null;
  search_keywords: string[];
  vendor_count: number;
  request_count: number;
}

interface GroupRow {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ServiceCategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithCounts[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCounts | null>(null);
  const [saving, setSaving] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupRow | null>(null);
  const [form] = Form.useForm();
  const [groupForm] = Form.useForm();
  const { message: notify } = useNotify();

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, groupRes] = await Promise.all([
        fetch('/api/admin/service-categories'),
        fetch('/api/admin/service-category-groups'),
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories ?? []);
      }
      if (groupRes.ok) {
        const groupData = await groupRes.json();
        setGroups(groupData.groups ?? []);
      }
    } catch {
      notify.error('Failed to load service categories');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Category CRUD
  // ---------------------------------------------------------------------------

  const openCreateModal = () => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({
      classifications: [],
      emergency_enabled: false,
      finish_level_enabled: false,
      external_link: false,
      search_keywords: [],
    });
    setModalOpen(true);
  };

  const openEditModal = (cat: CategoryWithCounts) => {
    setEditingCategory(cat);
    form.setFieldsValue({
      label: cat.label,
      group_key: cat.group_key,
      classifications: cat.classifications,
      emergency_enabled: cat.emergency_enabled,
      finish_level_enabled: cat.finish_level_enabled,
      external_link: cat.external_link,
      external_url: cat.external_url,
      search_keywords: cat.search_keywords,
    });
    setModalOpen(true);
  };

  const handleSaveCategory = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const url = editingCategory
        ? `/api/admin/service-categories/${editingCategory.id}`
        : '/api/admin/service-categories';
      const method = editingCategory ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const err = await res.json();
        notify.error(err.message || 'Failed to save category');
        return;
      }

      notify.success(editingCategory ? 'Category updated' : 'Category created');
      setModalOpen(false);
      fetchData();
    } catch {
      // validation error — form will show messages
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (cat: CategoryWithCounts) => {
    const res = await fetch(`/api/admin/service-categories/${cat.id}`, { method: 'DELETE' });
    if (res.ok) {
      notify.success('Category deactivated');
      fetchData();
    } else {
      const err = await res.json();
      notify.error(err.message || 'Failed to delete');
    }
  };

  const handleToggleActive = async (cat: CategoryWithCounts) => {
    const res = await fetch(`/api/admin/service-categories/${cat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !cat.is_active }),
    });
    if (res.ok) {
      fetchData();
    }
  };

  // ---------------------------------------------------------------------------
  // Reorder helpers
  // ---------------------------------------------------------------------------

  const moveCategory = async (cat: CategoryWithCounts, direction: 'up' | 'down') => {
    const groupCats = categories
      .filter((c) => c.group_key === cat.group_key)
      .sort((a, b) => a.sort_order - b.sort_order);

    const idx = groupCats.findIndex((c) => c.id === cat.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= groupCats.length) return;

    const items = [
      { id: groupCats[idx].id, sort_order: groupCats[swapIdx].sort_order },
      { id: groupCats[swapIdx].id, sort_order: groupCats[idx].sort_order },
    ];

    await fetch('/api/admin/service-categories/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    fetchData();
  };

  const moveGroup = async (group: GroupRow, direction: 'up' | 'down') => {
    const sorted = [...groups].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((g) => g.id === group.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const items = [
      { id: sorted[idx].id, sort_order: sorted[swapIdx].sort_order },
      { id: sorted[swapIdx].id, sort_order: sorted[idx].sort_order },
    ];

    await fetch('/api/admin/service-category-groups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    fetchData();
  };

  // ---------------------------------------------------------------------------
  // Group CRUD
  // ---------------------------------------------------------------------------

  const openGroupModal = (group?: GroupRow) => {
    setEditingGroup(group || null);
    groupForm.resetFields();
    if (group) {
      groupForm.setFieldsValue({ label: group.label });
    }
    setGroupModalOpen(true);
  };

  const handleSaveGroup = async () => {
    try {
      const values = await groupForm.validateFields();
      setSaving(true);

      if (editingGroup) {
        const res = await fetch(`/api/admin/service-category-groups/${editingGroup.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
        if (!res.ok) {
          const err = await res.json();
          notify.error(err.message);
          return;
        }
        notify.success('Group updated');
      } else {
        const res = await fetch('/api/admin/service-category-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
        if (!res.ok) {
          const err = await res.json();
          notify.error(err.message);
          return;
        }
        notify.success('Group created');
      }

      setGroupModalOpen(false);
      fetchData();
    } catch {
      // validation
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Table columns
  // ---------------------------------------------------------------------------

  const columns: ColumnsType<CategoryWithCounts> = [
    {
      title: 'Sort',
      width: 80,
      render: (_, record) => {
        const groupCats = categories
          .filter((c) => c.group_key === record.group_key)
          .sort((a, b) => a.sort_order - b.sort_order);
        const idx = groupCats.findIndex((c) => c.id === record.id);
        return (
          <Space size={4}>
            <Button
              type="text"
              size="small"
              icon={<ArrowUpOutlined />}
              disabled={idx === 0}
              onClick={() => moveCategory(record, 'up')}
            />
            <Button
              type="text"
              size="small"
              icon={<ArrowDownOutlined />}
              disabled={idx === groupCats.length - 1}
              onClick={() => moveCategory(record, 'down')}
            />
          </Space>
        );
      },
    },
    {
      title: 'Label',
      dataIndex: 'label',
      render: (label: string, record) => (
        <Space>
          <Text strong>{label}</Text>
          {record.emergency_enabled && <ThunderboltOutlined style={{ color: '#f5222d' }} />}
          {record.external_link && <LinkOutlined style={{ color: '#1890ff' }} />}
        </Space>
      ),
    },
    {
      title: 'Key',
      dataIndex: 'key',
      render: (key: string) => <Text code>{key}</Text>,
    },
    {
      title: 'Classifications',
      dataIndex: 'classifications',
      render: (c: ServiceClassification[]) => c.length,
      width: 110,
    },
    {
      title: 'Vendors',
      dataIndex: 'vendor_count',
      width: 80,
      align: 'center',
    },
    {
      title: 'Requests',
      dataIndex: 'request_count',
      width: 80,
      align: 'center',
    },
    {
      title: 'Active',
      dataIndex: 'is_active',
      width: 80,
      render: (active: boolean, record) => (
        <Switch checked={active} onChange={() => handleToggleActive(record)} size="small" />
      ),
    },
    {
      title: 'Actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          />
          <Popconfirm
            title="Deactivate this category?"
            description={
              record.vendor_count > 0 || record.request_count > 0
                ? `${record.vendor_count} vendors and ${record.request_count} requests use this category.`
                : undefined
            }
            onConfirm={() => handleDeleteCategory(record)}
            okText="Deactivate"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ---------------------------------------------------------------------------
  // Collapse panels (one per group)
  // ---------------------------------------------------------------------------

  const sortedGroups = [...groups].sort((a, b) => a.sort_order - b.sort_order);

  const collapseItems = sortedGroups.map((group, gIdx) => {
    const groupCats = categories
      .filter((c) => c.group_key === group.key)
      .sort((a, b) => a.sort_order - b.sort_order);

    const activeCats = groupCats.filter((c) => c.is_active);
    const totalVendors = groupCats.reduce((s, c) => s + c.vendor_count, 0);

    return {
      key: group.key,
      label: (
        <Space>
          <Text strong>{group.label}</Text>
          <Tag>{activeCats.length} categories</Tag>
          <Tag>{totalVendors} vendors</Tag>
          <Button
            type="text"
            size="small"
            icon={<ArrowUpOutlined />}
            disabled={gIdx === 0}
            onClick={(e) => { e.stopPropagation(); moveGroup(group, 'up'); }}
          />
          <Button
            type="text"
            size="small"
            icon={<ArrowDownOutlined />}
            disabled={gIdx === sortedGroups.length - 1}
            onClick={(e) => { e.stopPropagation(); moveGroup(group, 'down'); }}
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => { e.stopPropagation(); openGroupModal(group); }}
          />
        </Space>
      ),
      children: (
        <Table
          dataSource={groupCats}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
          rowClassName={(record) => (!record.is_active ? 'inactive-row' : '')}
        />
      ),
    };
  });

  // ---------------------------------------------------------------------------
  // Summary stats
  // ---------------------------------------------------------------------------

  const activeCount = categories.filter((c) => c.is_active).length;
  const totalVendors = categories.reduce((s, c) => s + c.vendor_count, 0);
  const totalRequests = categories.reduce((s, c) => s + c.request_count, 0);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Service Categories</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
          <Button icon={<PlusOutlined />} onClick={() => openGroupModal()}>Add Group</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>Add Category</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Groups" value={sortedGroups.length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Active Categories" value={activeCount} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Total Vendors" value={totalVendors} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Total Requests" value={totalRequests} />
          </Card>
        </Col>
      </Row>

      <Collapse
        items={collapseItems}
        defaultActiveKey={sortedGroups.map((g) => g.key)}
        style={{ marginBottom: 24 }}
      />

      <style jsx global>{`
        .inactive-row { opacity: 0.5; }
      `}</style>

      {/* ---- Category Modal ---- */}
      <Modal
        title={editingCategory ? `Edit: ${editingCategory.label}` : 'New Category'}
        open={modalOpen}
        onOk={handleSaveCategory}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        width={720}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="label" label="Label" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          {editingCategory && (
            <Form.Item label="Key">
              <Text code>{editingCategory.key}</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>(cannot be changed)</Text>
            </Form.Item>
          )}

          <Form.Item name="group_key" label="Group" rules={[{ required: true }]}>
            <Select
              options={sortedGroups.map((g) => ({ value: g.key, label: g.label }))}
            />
          </Form.Item>

          <Space size="large">
            <Form.Item name="emergency_enabled" label="Emergency" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="finish_level_enabled" label="Finish Level" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="external_link" label="External Link" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>

          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.external_link !== cur.external_link}
          >
            {({ getFieldValue }) =>
              getFieldValue('external_link') ? (
                <Form.Item name="external_url" label="External URL">
                  <Input placeholder="https://..." />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item name="search_keywords" label="Search Keywords">
            <Select mode="tags" placeholder="Add keywords..." />
          </Form.Item>

          {/* Classifications editor */}
          <Form.List name="classifications">
            {(fields, { add, remove, move }) => (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text strong>Classifications</Text>
                  <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add({ label: '', options: [] })}>
                    Add Classification
                  </Button>
                </div>
                {fields.map((field, index) => (
                  <Card
                    key={field.key}
                    size="small"
                    style={{ marginBottom: 8 }}
                    extra={
                      <Space size={4}>
                        <Button
                          type="text"
                          size="small"
                          icon={<ArrowUpOutlined />}
                          disabled={index === 0}
                          onClick={() => move(index, index - 1)}
                        />
                        <Button
                          type="text"
                          size="small"
                          icon={<ArrowDownOutlined />}
                          disabled={index === fields.length - 1}
                          onClick={() => move(index, index + 1)}
                        />
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          danger
                          onClick={() => remove(index)}
                        />
                      </Space>
                    }
                  >
                    <Form.Item
                      {...field}
                      name={[field.name, 'label']}
                      label="Classification Label"
                      rules={[{ required: true, message: 'Label is required' }]}
                      style={{ marginBottom: 8 }}
                    >
                      <Input placeholder="e.g., Service Needed" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'options']}
                      label="Options"
                      rules={[{ required: true, message: 'At least one option is required' }]}
                    >
                      <Select mode="tags" placeholder="Type options and press Enter..." />
                    </Form.Item>
                  </Card>
                ))}
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* ---- Group Modal ---- */}
      <Modal
        title={editingGroup ? `Edit Group: ${editingGroup.label}` : 'New Group'}
        open={groupModalOpen}
        onOk={handleSaveGroup}
        onCancel={() => setGroupModalOpen(false)}
        confirmLoading={saving}
      >
        <Form form={groupForm} layout="vertical">
          <Form.Item name="label" label="Group Label" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {editingGroup && (
            <Form.Item label="Key">
              <Text code>{editingGroup.key}</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>(cannot be changed)</Text>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}

'use client';

import { Button, Dropdown } from 'antd';
import { SunOutlined, MoonOutlined, DesktopOutlined } from '@ant-design/icons';
import { useThemeMode } from '@/theme/ThemeProvider';
import type { MenuProps } from 'antd';

export default function ThemeToggle({ size = 'middle' }: { size?: 'small' | 'middle' | 'large' }) {
  const { mode, resolved, setMode } = useThemeMode();

  const icon = resolved === 'dark' ? <MoonOutlined /> : <SunOutlined />;

  const items: MenuProps['items'] = [
    {
      key: 'light',
      icon: <SunOutlined />,
      label: 'Light',
    },
    {
      key: 'dark',
      icon: <MoonOutlined />,
      label: 'Dark',
    },
    {
      key: 'system',
      icon: <DesktopOutlined />,
      label: 'System',
    },
  ];

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    setMode(key as 'light' | 'dark' | 'system');
  };

  return (
    <Dropdown
      menu={{
        items,
        onClick: handleClick,
        selectedKeys: [mode],
      }}
      trigger={['click']}
    >
      <Button
        type="text"
        icon={icon}
        size={size}
        aria-label="Toggle theme"
      />
    </Dropdown>
  );
}

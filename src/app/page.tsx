"use client";

import { Typography, Button, Space } from "antd";
import { HomeOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function Home() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px"
    }}>
      <Space direction="vertical" align="center" size="large">
        <HomeOutlined style={{ fontSize: 64, color: "#1890ff" }} />
        <Title level={1}>Real Landlording</Title>
        <Text type="secondary" style={{ fontSize: 18 }}>
          Property management made simple
        </Text>
        <Space>
          <Button type="primary" size="large">
            Get Started
          </Button>
          <Button size="large">
            Learn More
          </Button>
        </Space>
      </Space>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Upload, Typography, App, Image } from 'antd';
import { InboxOutlined, DeleteOutlined, LoadingOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { FILE_UPLOAD_CONSTRAINTS } from '@/types/database';

const { Dragger } = Upload;
const { Text } = Typography;

interface MediaUploadProps {
  value?: string[];
  onChange?: (urls: string[]) => void;
  maxFiles?: number;
}

interface UploadedFile {
  url: string;
  path: string;
  fileName: string;
}

export default function MediaUpload({
  value = [],
  onChange,
  maxFiles = FILE_UPLOAD_CONSTRAINTS.maxFilesPerRequest,
}: MediaUploadProps) {
  const [fileList, setFileList] = useState<UploadFile[]>(() =>
    value.map((url, index) => ({
      uid: `existing-${index}`,
      name: url.split('/').pop() || `file-${index}`,
      status: 'done',
      url,
    }))
  );
  const [uploading, setUploading] = useState(false);
  const { message } = App.useApp();

  const uploadedUrls = fileList
    .filter((f) => f.status === 'done' && f.url)
    .map((f) => f.url as string);

  const handleUpload = async (file: File): Promise<boolean> => {
    // Validate file size
    if (file.size > FILE_UPLOAD_CONSTRAINTS.maxFileSizeBytes) {
      message.error(`${file.name} is too large. Maximum size is ${FILE_UPLOAD_CONSTRAINTS.maxFileSizeMB}MB`);
      return false;
    }

    // Validate file type
    if (!FILE_UPLOAD_CONSTRAINTS.allowedMimeTypes.includes(file.type)) {
      message.error(`${file.name} has an unsupported file type`);
      return false;
    }

    // Check max files
    if (fileList.length >= maxFiles) {
      message.error(`Maximum ${maxFiles} files allowed`);
      return false;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('files', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      if (data.uploaded && data.uploaded.length > 0) {
        const uploaded: UploadedFile = data.uploaded[0];
        const newFile: UploadFile = {
          uid: uploaded.path,
          name: uploaded.fileName,
          status: 'done',
          url: uploaded.url,
        };

        const newFileList = [...fileList, newFile];
        setFileList(newFileList);

        // Notify parent of URL changes
        const urls = newFileList
          .filter((f) => f.status === 'done' && f.url)
          .map((f) => f.url as string);
        onChange?.(urls);

        message.success(`${file.name} uploaded successfully`);
      }

      if (data.errors && data.errors.length > 0) {
        data.errors.forEach((err: { fileName: string; error: { message: string } }) => {
          message.error(`${err.fileName}: ${err.error.message}`);
        });
      }

      return true;
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Upload failed');
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (file: UploadFile): Promise<boolean> => {
    // If file has a path (was uploaded), delete from storage
    if (file.uid && !file.uid.startsWith('existing-')) {
      try {
        await fetch('/api/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: [file.uid] }),
        });
      } catch (error) {
        console.error('Failed to delete file from storage:', error);
      }
    }

    const newFileList = fileList.filter((f) => f.uid !== file.uid);
    setFileList(newFileList);

    // Notify parent of URL changes
    const urls = newFileList
      .filter((f) => f.status === 'done' && f.url)
      .map((f) => f.url as string);
    onChange?.(urls);

    return true;
  };

  const uploadProps: UploadProps = {
    name: 'files',
    multiple: true,
    fileList,
    listType: 'picture-card',
    beforeUpload: (file) => {
      handleUpload(file);
      return false; // Prevent default upload behavior
    },
    onRemove: handleRemove,
    accept: FILE_UPLOAD_CONSTRAINTS.allowedMimeTypes.join(','),
    showUploadList: {
      showPreviewIcon: true,
      showRemoveIcon: true,
      showDownloadIcon: false,
    },
    itemRender: (originNode, file) => {
      if (file.status === 'uploading') {
        return (
          <div style={{
            width: 104,
            height: 104,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed #d9d9d9',
            borderRadius: 8,
          }}>
            <LoadingOutlined />
          </div>
        );
      }
      return originNode;
    },
  };

  const canUploadMore = fileList.length < maxFiles && !uploading;

  return (
    <div>
      {canUploadMore && (
        <Dragger
          {...uploadProps}
          style={{ marginBottom: 16 }}
          height={150}
        >
          <p className="ant-upload-drag-icon">
            {uploading ? <LoadingOutlined /> : <InboxOutlined />}
          </p>
          <p className="ant-upload-text">
            Click or drag photos/videos to upload
          </p>
          <p className="ant-upload-hint">
            Max {maxFiles} files, {FILE_UPLOAD_CONSTRAINTS.maxFileSizeMB}MB each
          </p>
        </Dragger>
      )}

      {fileList.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <Image.PreviewGroup>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {fileList.map((file) => (
                <div
                  key={file.uid}
                  style={{
                    position: 'relative',
                    width: 104,
                    height: 104,
                    border: '1px solid #d9d9d9',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  {file.url && (
                    <Image
                      src={file.url}
                      alt={file.name}
                      width={104}
                      height={104}
                      style={{ objectFit: 'cover' }}
                      preview={{ mask: 'Preview' }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(file)}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: 'rgba(0,0,0,0.5)',
                      border: 'none',
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'white',
                    }}
                  >
                    <DeleteOutlined style={{ fontSize: 12 }} />
                  </button>
                </div>
              ))}
            </div>
          </Image.PreviewGroup>
        </div>
      )}

      <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
        Your media is securely shared only with the matched vendor
      </Text>
    </div>
  );
}

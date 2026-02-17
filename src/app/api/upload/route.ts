import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { FILE_UPLOAD_CONSTRAINTS } from '@/types/database';
import { randomUUID } from 'crypto';

const BUCKET_NAME = 'request-media';

export interface FileUploadResponse {
  url: string;
  path: string;
  fileName: string;
  size: number;
  mimeType: string;
}

export interface FileUploadError {
  fileName: string;
  error: {
    message: string;
    code: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'UPLOAD_FAILED' | 'MAX_FILES_EXCEEDED';
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { message: 'No files provided' },
        { status: 400 }
      );
    }

    // Check max files limit
    if (files.length > FILE_UPLOAD_CONSTRAINTS.maxFilesPerRequest) {
      return NextResponse.json(
        {
          message: `Maximum ${FILE_UPLOAD_CONSTRAINTS.maxFilesPerRequest} files allowed per upload`,
          code: 'MAX_FILES_EXCEEDED',
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const uploadedFiles: FileUploadResponse[] = [];
    const errors: FileUploadError[] = [];

    for (const file of files) {
      // Validate file size
      if (file.size > FILE_UPLOAD_CONSTRAINTS.maxFileSizeBytes) {
        errors.push({
          fileName: file.name,
          error: {
            message: `File exceeds ${FILE_UPLOAD_CONSTRAINTS.maxFileSizeMB}MB limit`,
            code: 'FILE_TOO_LARGE',
          },
        });
        continue;
      }

      // Validate file type
      if (!FILE_UPLOAD_CONSTRAINTS.allowedMimeTypes.includes(file.type)) {
        errors.push({
          fileName: file.name,
          error: {
            message: `File type ${file.type} is not allowed`,
            code: 'INVALID_TYPE',
          },
        });
        continue;
      }

      // Generate unique file path
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const uniqueId = randomUUID();
      const timestamp = Date.now();
      const filePath = `requests/${timestamp}/${uniqueId}.${fileExt}`;

      // Convert File to ArrayBuffer then to Buffer for upload
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        errors.push({
          fileName: file.name,
          error: {
            message: 'Failed to upload file',
            code: 'UPLOAD_FAILED',
          },
        });
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

      uploadedFiles.push({
        url: urlData.publicUrl,
        path: data.path,
        fileName: file.name,
        size: file.size,
        mimeType: file.type,
      });
    }

    return NextResponse.json({
      uploaded: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove uploaded files (for form reset or error recovery)
export async function DELETE(request: NextRequest) {
  try {
    const { paths } = await request.json();

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json(
        { message: 'No file paths provided' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(paths);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        { message: 'Failed to delete files' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Files deleted successfully' });
  } catch (error) {
    console.error('Delete API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * File Upload Utilities
 * formidable을 사용한 파일 업로드 처리
 */

import formidable, { File, Fields } from 'formidable';
import { NextApiRequest } from 'next';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from './errors';

// 업로드 디렉토리 설정
export const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// 허용된 MIME 타입
const ALLOWED_MIME_TYPES = [
  // 이미지
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // 문서
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // 텍스트
  'text/plain',
  'text/csv',
  'text/markdown',
  // 압축 파일
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
];

// 파일 크기 제한 (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export interface UploadedFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
}

/**
 * 업로드 디렉토리 초기화
 */
export function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * formidable로 파일 업로드 처리
 */
export async function parseFormData(req: NextApiRequest): Promise<{
  fields: Fields;
  files: UploadedFile[];
}> {
  ensureUploadDir();

  const form = formidable({
    uploadDir: UPLOAD_DIR,
    keepExtensions: true,
    maxFileSize: MAX_FILE_SIZE,
    filter: (part) => {
      // MIME 타입 검증
      const mimeType = part.mimetype || '';
      return ALLOWED_MIME_TYPES.includes(mimeType);
    },
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(new ValidationError(err.message));
        return;
      }

      // 업로드된 파일 처리
      const uploadedFiles: UploadedFile[] = [];

      Object.keys(files).forEach((key) => {
        const fileArray = files[key];
        if (!fileArray) return;

        const fileList = Array.isArray(fileArray) ? fileArray : [fileArray];

        fileList.forEach((file: File) => {
          if (!file.filepath || !file.originalFilename || !file.mimetype) {
            return;
          }

          // 파일 크기 검증
          if (file.size > MAX_FILE_SIZE) {
            fs.unlinkSync(file.filepath);
            throw new ValidationError(`파일 크기가 10MB를 초과합니다: ${file.originalFilename}`);
          }

          // MIME 타입 검증
          if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            fs.unlinkSync(file.filepath);
            throw new ValidationError(`허용되지 않는 파일 형식입니다: ${file.mimetype}`);
          }

          // 안전한 파일명 생성
          const ext = path.extname(file.originalFilename);
          const safeFilename = `${uuidv4()}${ext}`;
          const newPath = path.join(UPLOAD_DIR, safeFilename);

          // 파일 이동
          fs.renameSync(file.filepath, newPath);

          uploadedFiles.push({
            filename: safeFilename,
            originalName: file.originalFilename,
            mimeType: file.mimetype,
            size: file.size,
            storagePath: `/uploads/${safeFilename}`,
          });
        });
      });

      resolve({ fields, files: uploadedFiles });
    });
  });
}

/**
 * 파일 삭제
 */
export function deleteFile(filename: string): void {
  const filePath = path.join(UPLOAD_DIR, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * 파일 존재 확인
 */
export function fileExists(filename: string): boolean {
  const filePath = path.join(UPLOAD_DIR, filename);
  return fs.existsSync(filePath);
}

/**
 * MIME 타입으로 파일 타입 분류
 */
export function getFileType(mimeType: string): 'image' | 'document' | 'archive' | 'text' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('text/')) return 'text';
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint')) {
    return 'document';
  }
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) {
    return 'archive';
  }
  return 'other';
}

/**
 * API v1: Avatar Upload
 * POST /api/v1/upload/avatar - Upload avatar image
 */

import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

// Next.js body parser 비활성화 (formidable 사용을 위해)
export const config = {
  api: {
    bodyParser: false,
  },
};

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  // 인증 확인
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }

  try {
    // 업로드 디렉토리 확인/생성
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const form = formidable({
      uploadDir: UPLOAD_DIR,
      keepExtensions: true,
      maxFileSize: MAX_FILE_SIZE,
      filter: ({ mimetype }) => {
        return mimetype ? ALLOWED_TYPES.includes(mimetype) : false;
      },
    });

    const [, files] = await form.parse(req);
    
    const file = files.avatar?.[0];
    if (!file) {
      return res.status(400).json({ error: { message: '파일이 없습니다' } });
    }

    // 파일 이름 생성 (UUID + 확장자)
    const ext = path.extname(file.originalFilename || '.jpg');
    const newFilename = `${uuidv4()}${ext}`;
    const newPath = path.join(UPLOAD_DIR, newFilename);

    // 파일 이동
    fs.renameSync(file.filepath, newPath);

    // URL 반환
    const avatarUrl = `/uploads/avatars/${newFilename}`;

    return res.status(200).json({
      success: true,
      data: {
        url: avatarUrl,
        filename: newFilename,
      },
    });
  } catch (error: any) {
    console.error('Avatar upload error:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: { message: '파일 크기는 2MB 이하여야 합니다' } });
    }
    
    return res.status(500).json({ error: { message: '파일 업로드에 실패했습니다' } });
  }
}

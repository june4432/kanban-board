/**
 * API v1: OpenAPI Specification
 * GET /api/v1/openapi - Return OpenAPI spec in YAML format
 */

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const filePath = path.join(process.cwd(), 'docs', 'api', 'openapi.yaml');
    const fileContents = fs.readFileSync(filePath, 'utf8');

    res.setHeader('Content-Type', 'text/yaml');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(fileContents);
  } catch (error) {
    console.error('Error reading OpenAPI spec:', error);
    res.status(500).json({ error: 'Failed to load OpenAPI specification' });
  }
}

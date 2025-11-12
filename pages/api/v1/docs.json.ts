/**
 * OpenAPI Specification Endpoint
 * GET /api/v1/docs.json - Returns OpenAPI spec in JSON format
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { openapiSpec } from '@/lib/api-v1/openapi';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json(openapiSpec);
}

import { NextApiRequest, NextApiResponse } from 'next';
import { getRepositories } from '@/lib/repositories';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

interface SlackNotifyRequest {
  projectId: string;
  event: 'card_created' | 'card_moved' | 'card_updated' | 'card_deleted' | 'member_joined';
  cardTitle?: string;
  cardId?: string;
  fromColumn?: string;
  toColumn?: string;
  userName?: string;
  memberName?: string;
  projectName?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 인증 확인
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { projectId, event, cardTitle, cardId, fromColumn, toColumn, userName, memberName, projectName } = req.body as SlackNotifyRequest;

    if (!projectId || !event) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // member_joined 이벤트가 아닌 경우 cardTitle 필수
    if (event !== 'member_joined' && !cardTitle) {
      return res.status(400).json({ error: 'Missing cardTitle for card event' });
    }

    // 프로젝트 정보 가져오기
    const { projects } = getRepositories();
    const project = projects.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Slack 알림이 비활성화되어 있거나 webhook URL이 없으면 조기 반환
    if (!project.slackEnabled || !project.slackWebhookUrl) {
      return res.status(200).json({ success: true, message: 'Slack notifications disabled' });
    }

    // 이벤트에 따른 메시지 생성
    const message = formatSlackMessage(event, {
      projectName: projectName || project.name,
      cardTitle: cardTitle || '',
      cardId,
      fromColumn,
      toColumn,
      userName: userName || session.user.name || '알 수 없는 사용자',
      memberName: memberName
    });

    // Slack Webhook으로 메시지 전송
    const slackResponse = await fetch(project.slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!slackResponse.ok) {
      console.error('Slack notification failed:', await slackResponse.text());
      return res.status(500).json({ error: 'Failed to send Slack notification' });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending Slack notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function formatSlackMessage(event: string, data: {
  projectName: string;
  cardTitle: string;
  cardId?: string;
  fromColumn?: string;
  toColumn?: string;
  userName: string;
  memberName?: string;
}) {
  const { projectName, cardTitle, fromColumn, toColumn, userName, memberName } = data;

  let text = '';
  let color = '';
  let emoji = '';

  switch (event) {
    case 'card_created':
      text = `*${userName}*님이 새로운 카드를 생성했습니다`;
      color = '#22c55e'; // green
      emoji = '✅';
      break;
    case 'card_moved':
      text = `*${userName}*님이 카드를 이동했습니다`;
      color = '#3b82f6'; // blue
      emoji = '🔄';
      break;
    case 'card_updated':
      text = `*${userName}*님이 카드를 수정했습니다`;
      color = '#f59e0b'; // amber
      emoji = '✏️';
      break;
    case 'card_deleted':
      text = `*${userName}*님이 카드를 삭제했습니다`;
      color = '#ef4444'; // red
      emoji = '🗑️';
      break;
    case 'member_joined':
      text = `*${memberName || userName}*님이 프로젝트에 참여했습니다`;
      color = '#8b5cf6'; // purple
      emoji = '👋';
      break;
    default:
      text = `*${userName}*님이 카드를 업데이트했습니다`;
      color = '#6b7280'; // gray
      emoji = '📝';
  }

  const attachment: any = {
    color,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: event === 'member_joined'
            ? `${emoji} ${text}\n*프로젝트:* ${projectName}`
            : `${emoji} ${text}\n*프로젝트:* ${projectName}\n*카드:* ${cardTitle}`
        }
      }
    ]
  };

  // 카드 이동 이벤트인 경우 추가 정보
  if (event === 'card_moved' && fromColumn && toColumn) {
    attachment.blocks[0].text.text += `\n*이동:* ${fromColumn} → ${toColumn}`;
  }

  return {
    text: event === 'member_joined'
      ? `${emoji} ${text}`
      : `${emoji} ${text}: ${cardTitle}`,
    attachments: [attachment]
  };
}

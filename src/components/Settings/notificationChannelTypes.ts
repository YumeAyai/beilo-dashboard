import type { NotificationChannel } from '../../services/api';
export const notificationChannelTypes: NotificationChannel['type'][] = ['email', 'weixin', 'wecom', 'feishu', 'lark', 'dingtalk', 'slack', 'telegram', 'discord', 'teams', 'webhook'];
export const notificationChannelLabel = (type: string) => `notificationPipeline.channel_${type}`;

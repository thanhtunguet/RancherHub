import { getApiClient } from '../api/client';
import type { CreateMessageTemplateDto, UpdateMessageTemplateDto, PreviewTemplateDto, MessageTemplate } from '../api/types';

export const MessageTemplatesRepository = {
  findAll: () =>
    getApiClient().get<MessageTemplate[]>('/api/message-templates').then(r => r.data),

  findOne: (id: string) =>
    getApiClient().get<MessageTemplate>(`/api/message-templates/${id}`).then(r => r.data),

  findByType: (type: string) =>
    getApiClient().get<MessageTemplate>(`/api/message-templates/type/${type}`).then(r => r.data),

  create: (dto: CreateMessageTemplateDto) =>
    getApiClient().post('/api/message-templates', dto).then(r => r.data),

  update: (id: string, dto: UpdateMessageTemplateDto) =>
    getApiClient().put(`/api/message-templates/${id}`, dto).then(r => r.data),

  remove: (id: string) =>
    getApiClient().delete(`/api/message-templates/${id}`).then(r => r.data),

  restoreDefault: (id: string) =>
    getApiClient().post(`/api/message-templates/${id}/restore`, {}).then(r => r.data),

  preview: (dto: PreviewTemplateDto) =>
    getApiClient().post('/api/message-templates/preview', dto).then(r => r.data),
};

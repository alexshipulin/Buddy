import { ChatMessage } from '../../domain/models';
import { createId } from '../../utils/id';
import { getJson, setJson } from '../storage/storage';

const CHAT_KEY = 'buddy_chat_messages';

export class ChatRepo {
  async listMessages(): Promise<ChatMessage[]> {
    const messages = await getJson<ChatMessage[]>(CHAT_KEY, []);
    return [...messages].sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  }
  private async saveMessages(messages: ChatMessage[]): Promise<void> {
    await setJson(CHAT_KEY, messages);
  }
  async addMessage(role: ChatMessage['role'], text: string, sourceKey?: string): Promise<void> {
    const messages = await this.listMessages();
    messages.push({ id: createId('chat'), role, text, createdAt: new Date().toISOString(), sourceKey });
    await this.saveMessages(messages);
  }
  async addSystemMessageIfMissing(sourceKey: string, text: string): Promise<void> {
    const messages = await this.listMessages();
    if (messages.some((m) => m.sourceKey === sourceKey)) return;
    await this.addMessage('system', text, sourceKey);
  }
}

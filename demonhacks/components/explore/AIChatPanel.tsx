import React from 'react';
import { ScrollableMessageContainer } from '@/src/components/tambo/scrollable-message-container';
import {
  ThreadContent,
  ThreadContentMessages,
} from '@/src/components/tambo/thread-content';
import {
  MessageInput,
  MessageInputTextarea,
  MessageInputToolbar,
  MessageInputSubmitButton,
  MessageInputError,
} from '@/src/components/tambo/message-input';

export default function AIChatPanel() {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <ScrollableMessageContainer className="flex-1 p-4">
        <ThreadContent>
          <ThreadContentMessages />
        </ThreadContent>
      </ScrollableMessageContainer>
      <div style={{ padding: '8px 12px 12px' }}>
        <MessageInput>
          <MessageInputTextarea placeholder="Ask about places, events, or quests..." />
          <MessageInputToolbar>
            <MessageInputSubmitButton />
          </MessageInputToolbar>
          <MessageInputError />
        </MessageInput>
      </div>
    </div>
  );
}

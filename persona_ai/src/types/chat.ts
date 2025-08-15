export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
  error?: string;
  details?: string;
}

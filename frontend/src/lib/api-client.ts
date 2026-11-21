// Mock API client — all calls are local (no network requests).
// When a real backend is connected, replace these with actual fetch calls.

import type { Explanation, InsuredUser } from '@/lib/types'
import { findExplanationForQuestion, glossary, fallbackExplanation } from '@/lib/mock/glossary'

const mockUser: InsuredUser = {
  firstName: 'Anna',
  lastName: 'Kowalska',
  peselMasked: '92•••••••45',
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export async function loginWithMObywatel(): Promise<{ user: InsuredUser }> {
  await delay(1200)
  return { user: mockUser }
}

export async function askAssistantApi(message: string): Promise<Explanation> {
  if (!message.trim()) {
    throw new Error('Brak treści pytania')
  }
  await delay(700)
  return findExplanationForQuestion(message)
}

export async function getExplanation(topicId: string): Promise<Explanation> {
  await delay(500)
  return glossary[topicId] ?? fallbackExplanation
}

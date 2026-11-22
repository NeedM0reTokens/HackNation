import React from 'react';
import { AiFieldExplainer } from './AiFieldExplainer';

export function ExplainSparkle({ topicId, label }: { topicId: string; label: string }) {
  return <AiFieldExplainer topicId={topicId} label={label} variant="icon" />;
}

export default ExplainSparkle;

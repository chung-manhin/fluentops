import { StateGraph, Annotation, END, START } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';

const CoachState = Annotation.Root({
  text: Annotation<string>,
  goals: Annotation<string[]>,
  issues: Annotation<string[]>,
  rewrites: Annotation<string[]>,
  drills: Annotation<string[]>,
  rubric: Annotation<Record<string, number>>,
  feedback: Annotation<string>,
});

export type CoachStateType = typeof CoachState.State;

interface LLM {
  invoke(messages: Array<{ role: string; content: string }>): Promise<{ content: string }>;
}

// Mock LLM that returns deterministic results
class MockLLM implements LLM {
  private callCount = 0;
  async invoke(): Promise<{ content: string }> {
    this.callCount++;
    switch (this.callCount) {
      case 1: // diagnose
        return { content: JSON.stringify(['Used "go" instead of "went" (past tense)', 'Used "buyed" instead of "bought" (irregular verb)']) };
      case 2: // rewrite
        return { content: JSON.stringify(['I went to school yesterday and bought a book.', 'Yesterday I went to school and purchased a book.']) };
      case 3: // drills
        return { content: JSON.stringify(['Fill in: I ___ (go) to the store yesterday.', 'Correct: She buyed a new dress.', 'Choose: He (went/go/goes) home early.']) };
      case 4: // score
        return { content: JSON.stringify({ rubric: { grammar: 40, vocab: 60, fluency: 50, clarity: 65, naturalness: 45 }, feedback: '**Assessment Summary**\n\nThe text contains basic past tense errors. Focus on irregular verb forms.' }) };
      default:
        return { content: '[]' };
    }
  }
}

async function diagnose(state: CoachStateType, llm: LLM): Promise<Partial<CoachStateType>> {
  const res = await llm.invoke([
    { role: 'system', content: 'You are an English language coach. Analyze the following text and return a JSON array of grammar, vocabulary, and expression issues. Each item should be a short string describing the issue. Return ONLY a JSON array.' },
    { role: 'user', content: state.text },
  ]);
  return { issues: JSON.parse(res.content as string) };
}

async function rewrite(state: CoachStateType, llm: LLM): Promise<Partial<CoachStateType>> {
  const res = await llm.invoke([
    { role: 'system', content: 'You are an English language coach. Given the original text and its issues, provide 2-3 natural rewrites. Return ONLY a JSON array of strings.' },
    { role: 'user', content: `Original: ${state.text}\nIssues: ${JSON.stringify(state.issues)}` },
  ]);
  return { rewrites: JSON.parse(res.content as string) };
}

async function drills(state: CoachStateType, llm: LLM): Promise<Partial<CoachStateType>> {
  const res = await llm.invoke([
    { role: 'system', content: 'You are an English language coach. Based on the issues found, generate 3 practice exercises. Return ONLY a JSON array of strings, each being a drill/exercise prompt.' },
    { role: 'user', content: `Issues: ${JSON.stringify(state.issues)}` },
  ]);
  return { drills: JSON.parse(res.content as string) };
}

async function score(state: CoachStateType, llm: LLM): Promise<Partial<CoachStateType>> {
  const res = await llm.invoke([
    { role: 'system', content: 'You are an English language coach. Score the original text on these dimensions (0-100): grammar, vocab, fluency, clarity, naturalness. Also write a short markdown summary. Return ONLY JSON: {"rubric":{"grammar":N,"vocab":N,"fluency":N,"clarity":N,"naturalness":N},"feedback":"...markdown..."}' },
    { role: 'user', content: `Original: ${state.text}\nGoals: ${(state.goals || []).join(', ') || 'general improvement'}` },
  ]);
  const parsed = JSON.parse(res.content as string);
  return { rubric: parsed.rubric, feedback: parsed.feedback };
}

export interface NodeCallback {
  beforeNode(name: string): Promise<void>;
  afterNode(name: string): Promise<void>;
}

export function buildGraph(llm: LLM, callbacks?: NodeCallback) {
  const wrap = (name: string, fn: (s: CoachStateType, l: LLM) => Promise<Partial<CoachStateType>>) => {
    return async (s: CoachStateType) => {
      if (callbacks) await callbacks.beforeNode(name);
      const result = await fn(s, llm);
      if (callbacks) await callbacks.afterNode(name);
      return result;
    };
  };

  const graph = new StateGraph(CoachState)
    .addNode('diagnose', wrap('diagnose', diagnose))
    .addNode('rewrite', wrap('rewrite', rewrite))
    .addNode('drills', wrap('drills', drills))
    .addNode('score', wrap('score', score))
    .addEdge(START, 'diagnose')
    .addEdge('diagnose', 'rewrite')
    .addEdge('rewrite', 'drills')
    .addEdge('drills', 'score')
    .addEdge('score', END);

  return graph.compile();
}

export function createLLM(provider: string, apiKey: string, model: string, temperature: number): LLM {
  if (provider === 'mock' || !apiKey) {
    return new MockLLM();
  }
  return new ChatOpenAI({ openAIApiKey: apiKey, modelName: model, temperature }) as unknown as LLM;
}

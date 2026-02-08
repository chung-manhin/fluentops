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

function buildModel(apiKey: string, model: string, temperature: number) {
  return new ChatOpenAI({ openAIApiKey: apiKey, modelName: model, temperature });
}

async function diagnose(
  state: typeof CoachState.State,
  llm: ChatOpenAI,
): Promise<Partial<typeof CoachState.State>> {
  const res = await llm.invoke([
    {
      role: 'system',
      content:
        'You are an English language coach. Analyze the following text and return a JSON array of grammar, vocabulary, and expression issues. Each item should be a short string describing the issue. Return ONLY a JSON array.',
    },
    { role: 'user', content: state.text },
  ]);
  const issues = JSON.parse(res.content as string);
  return { issues };
}

async function rewrite(
  state: typeof CoachState.State,
  llm: ChatOpenAI,
): Promise<Partial<typeof CoachState.State>> {
  const res = await llm.invoke([
    {
      role: 'system',
      content:
        'You are an English language coach. Given the original text and its issues, provide 2-3 natural rewrites. Return ONLY a JSON array of strings.',
    },
    {
      role: 'user',
      content: `Original: ${state.text}\nIssues: ${JSON.stringify(state.issues)}`,
    },
  ]);
  const rewrites = JSON.parse(res.content as string);
  return { rewrites };
}

async function drills(
  state: typeof CoachState.State,
  llm: ChatOpenAI,
): Promise<Partial<typeof CoachState.State>> {
  const res = await llm.invoke([
    {
      role: 'system',
      content:
        'You are an English language coach. Based on the issues found, generate 3 practice exercises. Return ONLY a JSON array of strings, each being a drill/exercise prompt.',
    },
    {
      role: 'user',
      content: `Issues: ${JSON.stringify(state.issues)}`,
    },
  ]);
  const d = JSON.parse(res.content as string);
  return { drills: d };
}

async function score(
  state: typeof CoachState.State,
  llm: ChatOpenAI,
): Promise<Partial<typeof CoachState.State>> {
  const res = await llm.invoke([
    {
      role: 'system',
      content: `You are an English language coach. Score the original text on these dimensions (0-100): grammar, vocab, fluency, clarity, naturalness. Also write a short markdown summary. Return ONLY JSON: {"rubric":{"grammar":N,"vocab":N,"fluency":N,"clarity":N,"naturalness":N},"feedback":"...markdown..."}`,
    },
    {
      role: 'user',
      content: `Original: ${state.text}\nGoals: ${(state.goals || []).join(', ') || 'general improvement'}`,
    },
  ]);
  const parsed = JSON.parse(res.content as string);
  return { rubric: parsed.rubric, feedback: parsed.feedback };
}

export function buildGraph(apiKey: string, model: string, temperature: number) {
  const llm = buildModel(apiKey, model, temperature);

  const graph = new StateGraph(CoachState)
    .addNode('diagnose', (s) => diagnose(s, llm))
    .addNode('rewrite', (s) => rewrite(s, llm))
    .addNode('drills', (s) => drills(s, llm))
    .addNode('score', (s) => score(s, llm))
    .addEdge(START, 'diagnose')
    .addEdge('diagnose', 'rewrite')
    .addEdge('rewrite', 'drills')
    .addEdge('drills', 'score')
    .addEdge('score', END);

  return graph.compile();
}

export type CoachStateType = typeof CoachState.State;

/**
 * Integración OPCIONAL con Claude (Anthropic API) para proponer casos adicionales
 * a partir de historias de usuario / criterios de aceptación.
 * Si no hay ANTHROPIC_API_KEY el agente funciona igual con sus reglas deterministas.
 */
export const isLlmEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

export async function suggestCases({ requirements, siteSummary, existingSummaries }) {
  if (!isLlmEnabled()) throw new Error('Define ANTHROPIC_API_KEY en agent/.env para usar el enriquecimiento con IA');
  const prompt = `Eres un analista QA senior. A partir de la historia de usuario y del resumen del sitio, propone casos de prueba ADICIONALES
(no repitas los existentes). Responde SOLO con un JSON: [{"summary": "...", "priority": "High|Medium|Low", "component": "...",
"labels": ["..."], "precondition": "...", "steps": [{"action": "...", "data": "...", "expected": "..."}]}]. Máximo 8 casos, en español.

HISTORIA / REQUISITOS:
${requirements}

RESUMEN DEL SITIO:
${siteSummary}

CASOS EXISTENTES:
${existingSummaries.join('\n')}`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.map((c) => c.text ?? '').join('') ?? '';
  const json = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);
  return JSON.parse(json).map((c) => ({
    issueType: 'Test',
    testType: 'Manual',
    automation: 'UI',
    labels: [],
    precondition: '',
    ...c,
    labels: [...(c.labels ?? []), 'ia'],
  }));
}

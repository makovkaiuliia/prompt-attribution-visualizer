// Thin OpenAI Chat Completions client. Kept provider-specific details in one place.

const ENDPOINT = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o'

// Single low-level call. Throws a readable Error on API errors or an empty/malformed
// response (the original code blindly read choices[0] and could crash on edge cases).
async function chat(apiKey, body) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, ...body }),
  })

  const data = await res.json()
  if (data.error) throw new Error(data.error.message)

  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('Пустой ответ от модели')
  return content
}

export async function getModelResponse(apiKey, systemPrompt, userMessage) {
  return chat(apiKey, {
    temperature: 0.7,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  })
}

// Attributes a SINGLE user-selected fragment of the response back to prompt fragments.
// On-demand: called per selection, so we send the exact selected text (no whole-response
// segmentation needed). Uses response_format: json_object for safe parsing.
// Returns an array of spans: [{ text, influence, explanation }].
export async function analyzeFragment(apiKey, systemPrompt, userMessage, modelResponse, fragment) {
  const content = await chat(apiKey, {
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: buildFragmentPrompt(systemPrompt, userMessage, modelResponse, fragment) }],
  })

  const parsed = JSON.parse(content)
  return Array.isArray(parsed.spans) ? parsed.spans : []
}

function buildFragmentPrompt(systemPrompt, userMessage, modelResponse, fragment) {
  return `Ты анализатор влияния системного промпта на ответ LLM.

СИСТЕМНЫЙ ПРОМПТ:
"""
${systemPrompt}
"""

ЗАПРОС ПОЛЬЗОВАТЕЛЯ (только для контекста, НЕ источник атрибуции):
"""
${userMessage}
"""

ПОЛНЫЙ ОТВЕТ МОДЕЛИ (для контекста):
"""
${modelResponse}
"""

ВЫДЕЛЕННЫЙ ФРАГМЕНТ ОТВЕТА (анализируй именно его):
"""
${fragment}
"""
# РОЛЬ И ЗАДАЧА
Определи, какие части СИСТЕМНОГО ПРОМПТА повлияли именно на ВЫДЕЛЕННЫЙ ФРАГМЕНТ ответа.

ВАЖНО — что считается влиянием:
Влияние — это не только О ЧЁМ написан фрагмент (содержание), но и КАК он написан (ФОРМА):
регистр букв, длина/краткость, грамматика, пунктуация, стиль, формат.
Даже если СОДЕРЖАНИЕ фрагмента пришло из запроса пользователя, его ФОРМА часто задаётся
системным промптом — и это надо атрибутировать.

Пример рассуждения: если фрагмент написан строчными буквами — это следствие правила про
регистр в промпте, даже если само слово взято из запроса. Если такое правило конфликтует
с другим правилом (например «грамотно» или «соблюдать капитализацию») — отметь ОБА
конфликтующих правила и объясни конфликт.

Обрати внимание на логические несоответствия и противоречия между правилами промпта.

Верни СТРОГО JSON такого вида:
{
  "spans": [
    {
      "text": "точная дословная цитата из СИСТЕМНОГО ПРОМПТА",
      "influence": 0,
      "explanation": "почему этот фрагмент промпта повлиял на выделенный фрагмент ответа (по содержанию или по форме)"
    }
  ]
}

ПРАВИЛА:
- "text" каждого span — ДОСЛОВНАЯ подстрока СИСТЕМНОГО ПРОМПТА.
- атрибутируй ТОЛЬКО к системному промпту; запрос пользователя источником не считается.
- учитывай влияние и по содержанию, и по форме (регистр, длина, грамматика, стиль).
- influence — целое число 0..100.
- "spans": [] возвращай ТОЛЬКО если фрагмент действительно никак (ни по форме, ни по содержанию) не связан с промптом. Это редкий случай.`
}

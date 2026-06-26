import { useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowRight, Sparkles } from './icons.jsx'
import { getModelResponse, analyzeFragment } from './api.js'
import { buildPromptHighlights, colorForInfluence } from './attribution.js'

const DEFAULT_PROMPT = `1) be concise
2) write everything in lowercase
3) write grammatically correct
4) always follow proper capitalization rules`

export default function App() {
  const [apiKey, setApiKey] = useState('')
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT)
  const [userMessage, setUserMessage] = useState('Ask me how my trip to Paris went')

  const [modelResponse, setModelResponse] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [spans, setSpans] = useState([])

  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)

  const responseRef = useRef(null)

  // Derived: system prompt rendered as overlap-safe highlighted runs for the spans
  // that influenced the currently selected fragment.
  const promptRuns = useMemo(() => buildPromptHighlights(systemPrompt, spans), [systemPrompt, spans])

  const handleGetResponse = async () => {
    if (!apiKey) return setError('Enter your OpenAI API key')
    setLoading(true)
    setError('')
    setSelectedText('')
    setSpans([])
    try {
      const content = await getModelResponse(apiKey, systemPrompt, userMessage)
      setModelResponse(content)
      setStep(2)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  // Triggered when the user finishes a text selection inside the response. Sends the
  // exact selected fragment to the analyzer and highlights the influencing prompt parts.
  const handleSelect = async () => {
    const text = (window.getSelection()?.toString() || '').trim()
    if (!text || text === selectedText) return // ignore empty / already-analyzed selection

    setSelectedText(text)
    setSpans([])
    setAnalyzing(true)
    setError('')
    try {
      const result = await analyzeFragment(apiKey, systemPrompt, userMessage, modelResponse, text)
      setSpans(result)
    } catch (err) {
      setError('Analysis failed: ' + err.message)
    }
    setAnalyzing(false)
  }

  const reset = () => {
    setModelResponse('')
    setSelectedText('')
    setSpans([])
    setError('')
    setStep(1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="text-purple-600" size={32} />
            <h1 className="text-3xl font-bold text-slate-800">Prompt Attribution Visualizer</h1>
          </div>
          <p className="text-slate-600">Select any part of the model response → see which parts of the prompt influenced it</p>
        </header>

        <Stepper step={step} />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-600 mt-0.5" size={20} />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Field label="OpenAI API Key">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="sk-..."
            />
          </Field>
          <Field label="User message">
            <input
              type="text"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Your request..."
            />
          </Field>
        </div>

        <Field label="System prompt (instructions)" className="mb-6">
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
            rows="5"
          />
        </Field>

        {step === 1 && (
          <button
            onClick={handleGetResponse}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? 'Getting model response...' : 'Step 1: Get model response'}
          </button>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6">
              <p className="text-slate-700 text-center font-semibold">
                💡 Select any text in the model response → the prompt parts that influenced it get highlighted
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PromptPanel runs={promptRuns} spans={spans} selectedText={selectedText} analyzing={analyzing} />
              <ResponsePanel responseRef={responseRef} response={modelResponse} selectedText={selectedText} onSelect={handleSelect} />
            </div>

            <button onClick={reset} className="w-full px-6 py-4 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all">
              Start a new analysis
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Stepper({ step }) {
  const labels = ['1. Get response', '2. Select & inspect']
  return (
    <div className="mb-8 flex items-center justify-center gap-4 flex-wrap">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-lg font-semibold ${step >= i + 1 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'}`}>
            {label}
          </div>
          {i < labels.length - 1 && <ArrowRight size={20} className="text-gray-400" />}
        </div>
      ))}
    </div>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 border border-slate-200 ${className}`}>
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
      {children}
    </div>
  )
}

// Shows the system prompt with overlap-safe highlights plus a details list of the spans
// that influenced the currently selected response fragment.
function PromptPanel({ runs, spans, selectedText, analyzing }) {
  const hasSelection = Boolean(selectedText)
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-slate-200">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">
        System prompt
        {hasSelection && spans.length > 0 && <span className="ml-2 text-sm text-purple-600">(highlighted)</span>}
      </h2>
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div className="whitespace-pre-wrap font-mono text-sm text-slate-700">
          {runs.map((run, idx) =>
            run.span ? (
              <mark key={idx} className={`${colorForInfluence(run.span.influence)} px-1 rounded cursor-help`} title={run.span.explanation}>
                {run.text}
              </mark>
            ) : (
              <span key={idx}>{run.text}</span>
            ),
          )}
        </div>
      </div>

      {analyzing && <p className="mt-4 text-sm text-purple-600 italic">Analyzing the selected fragment...</p>}

      {!analyzing && hasSelection && spans.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">Influence details:</h3>
          {spans.map((span, idx) => (
            <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
              <div>
                <span className="font-semibold text-slate-700">Fragment:</span>
                <span className="ml-2 font-mono text-slate-600">"{span.text}"</span>
              </div>
              <div className="mt-1">
                <span className="font-semibold text-slate-700">Influence:</span>
                <span className="ml-2 text-slate-600">{span.influence}%</span>
              </div>
              <div className="mt-1">
                <span className="font-semibold text-slate-700">Explanation:</span>
                <p className="mt-1 text-slate-600">{span.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!analyzing && hasSelection && spans.length === 0 && (
        <p className="mt-4 text-sm text-slate-500 italic">The prompt didn't influence the selected fragment.</p>
      )}
    </div>
  )
}

function ResponsePanel({ responseRef, response, selectedText, onSelect }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-purple-200">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">
        Model response
        {selectedText && <span className="ml-2 text-sm text-green-600">(selected: "{selectedText}")</span>}
      </h2>
      <div
        ref={responseRef}
        onMouseUp={onSelect}
        className="bg-purple-50 p-4 rounded-lg border border-purple-200 select-text cursor-text"
      >
        <p className="text-slate-700 text-lg leading-relaxed whitespace-pre-wrap">{response}</p>
      </div>
      {!selectedText && <p className="mt-4 text-sm text-slate-500 italic text-center">Select any text above with your mouse 👆</p>}
    </div>
  )
}

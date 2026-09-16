import { FormEvent } from 'react'

interface QueryFormProps {
  query: string
  onQueryChange: (value: string) => void
  onSubmit: () => void
}

const EXAMPLE_QUESTION =
  'I am a 19-year-old student from Punjab with family income of ₹3 lakh. What government schemes am I eligible for?'

export default function QueryForm({ query, onQueryChange, onSubmit }: QueryFormProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8">
      <label htmlFor="question" className="block text-sm font-medium text-ink mb-2">
        Describe your situation
      </label>
      <textarea
        id="question"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        rows={4}
        placeholder={EXAMPLE_QUESTION}
        className="w-full resize-none rounded-sm border border-line bg-white px-4 py-3 text-ink placeholder:text-inkmuted/70 focus:border-accent outline-none transition-colors"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="bg-accent hover:bg-accentdeep text-white text-sm font-medium px-5 py-2.5 rounded-sm transition-colors"
        >
          Ask GovSathi
        </button>
        <button
          type="button"
          onClick={() => onQueryChange(EXAMPLE_QUESTION)}
          className="text-sm text-inkmuted hover:text-ink underline underline-offset-2 decoration-line"
        >
          Try the example question
        </button>
      </div>
    </form>
  )
}

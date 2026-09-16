import express from 'express'
import { GoogleGenAI } from '@google/genai'

const app = express()
app.use(express.json())

// Reads the key ONLY from the server-side environment — never from client code.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const MODEL = 'gemini-3.1-flash-lite'

app.post('/api/generate-answer', async (req, res) => {
  const { query, results, language } = req.body ?? {}

  if (typeof query !== 'string' || !Array.isArray(results)) {
    return res.status(400).json({ error: 'query and results are required' })
  }

  const context = results
    .map((s: any, i: number) => {
      const docs = Array.isArray(s.documents) ? s.documents.join(', ') : ''
      return `${i + 1}. ${s.name} (${s.category}) — Eligibility: ${s.eligibility} — Documents: ${docs}`
    })
    .join('\n')

  const prompt = `You are GovSathi, a citizen-facing assistant that explains Indian government schemes in plain language.

Rules you must follow strictly:
- Answer ONLY using the SCHEME CONTEXT below. Never invent eligibility rules, documents, benefits, or any scheme detail not present in the context.
- If the context is insufficient to answer the user's question, say so plainly instead of guessing.
- Describe every scheme as a "potential match", never as confirmed eligibility.
- Keep the answer short (a few sentences) and citizen-friendly, avoiding jargon.
- Respond entirely in this language: ${language || 'en'}.

SCHEME CONTEXT:
${context || '(no schemes retrieved)'}

USER QUESTION:
${query}`

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    })

    const text = response.text?.trim()
    if (!text) throw new Error('Empty response from Gemini')

    res.json({ answer: text })
  } catch (err) {
    console.error('Gemini request failed:', err)
    res.status(502).json({ error: 'AI generation failed' })
  }
})

const port = process.env.PORT || 3001
app.listen(port, () => {
  console.log(`GovSathi AI backend listening on port ${port}`)
})

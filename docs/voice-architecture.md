# Voice (deferred; not implemented)

Planned flow: speech -> STT -> the existing text pipeline (query understanding, retrieval, eligibility, grounded answer) -> optional TTS.

The text pipeline already takes a plain string and a language code, so voice is an input/output adapter:

```ts
interface SpeechProvider {
  transcribe(audio: Blob, language: LanguageCode): Promise<{ text: string; language: LanguageCode }>;
  speak?(text: string, language: LanguageCode): Promise<Blob>;
}
```

Options to evaluate (none adopted): Bhashini ASR/TTS (needs registration; Rajasthani support unconfirmed), AI4Bharat models,
Gemini audio input, and the browser Web Speech API (language support varies and audio may leave the device; would need an
explicit consent notice). Voice was NOT implemented because no option has been verified for Indian-language quality,
licensing and privacy. No voice UI is shown.

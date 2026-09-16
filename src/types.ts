export interface Scheme {
  id: string
  name: string
  category: string
  description: string
  eligibility: string
  documents: string[]
  keywords: string[]
}

export interface ScoredScheme extends Scheme {
  score: number
}

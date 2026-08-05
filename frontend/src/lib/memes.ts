/**
 * Мемы раздела /memes — короткие грамматические шутки для детей (5–9 классы).
 * TODO: заменить на мемы заказчицы, когда пришлёт (контент-заглушка, W3-T5).
 */
export interface Meme {
  id: string
  setup: string
  punchline: string
}

export const MEMES: Meme[] = [
  {
    id: "homework-cake",
    setup: "— Why did the student eat his homework?",
    punchline: "— Because the teacher said it was a piece of cake!",
  },
  {
    id: "tenses-magic",
    setup: "Present Simple: I work. Past Simple: I worked. Future: I will work.",
    punchline: "И никакой магии!",
  },
  {
    id: "dog-continuous",
    setup: "— Can I have a dog, mum?",
    punchline: "— Present Continuous: I am asking!",
  },
  {
    id: "past-simple-sad",
    setup: "— Why is Past Simple always sad?",
    punchline: "— Because it's always living in the past!",
  },
  {
    id: "verb-gym",
    setup: "— Why did the verb go to the gym?",
    punchline: "— To stay in good form!",
  },
]

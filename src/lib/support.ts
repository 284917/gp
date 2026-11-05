/** Темы вопросов куратору. */
export const QUESTION_TOPICS = {
  access: 'Не могу войти в кабинет',
  application: 'Заявка в программу',
  program: 'Задания, баллы и награды',
  other: 'Другое',
} as const;
export type QuestionTopic = keyof typeof QUESTION_TOPICS;
export const isQuestionTopic = (v: unknown): v is QuestionTopic => typeof v === 'string' && v in QUESTION_TOPICS;

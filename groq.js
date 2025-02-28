import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const generateMCQs = async (language, subject, paragraphs) => {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant specialized in creating multiple-choice quizzes. Respond only in JSON format. Do not include any additional text or explanations. Generate 10 challenging MCQs.`,
        },
        {
          role: 'user',
          content: `Language: ${language}\nSubject: ${subject}\n\nParagraphs:\n${paragraphs}\n\nGenerate a set of 10 challenging and scientifically accurate MCQs based on the information above. Each question should have 4 choices (a, b, c, d), with one correct answer. Return the data in JSON format. Example format:
          [
            {
              "question": "What is the capital of France?",
              "choices": {
                "a": "Paris",
                "b": "London",
                "c": "Berlin",
                "d": "Madrid"
              },
              "correctAnswer": "a"
            }
          ]`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_completion_tokens: 1024,
      top_p: 1,
      stop: null,
      stream: false,
    });

    const quiz = JSON.parse(chatCompletion.choices[0]?.message?.content || '[]');
    return quiz;
  } catch (error) {
    console.error('Error generating MCQs:', error);
    return [];
  }
};
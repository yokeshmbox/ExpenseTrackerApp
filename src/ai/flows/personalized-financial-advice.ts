'use server';

/**
 * @fileOverview A flow for providing personalized financial advice based on user spending habits.
 *
 * - getPersonalizedFinancialAdvice - A function that returns personalized financial advice.
 * - PersonalizedFinancialAdviceInput - The input type for the getPersonalizedFinancialAdvice function.
 * - PersonalizedFinancialAdviceOutput - The return type for the getPersonalizedFinancialAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedFinancialAdviceInputSchema = z.object({
  income: z.number().describe("The user's monthly income in Indian Rupees (INR)."),
  spendingByCategory: z
    .record(z.string(), z.number())
    .describe(
      'A record of the user\'s spending in Indian Rupees (INR), with categories as keys and amounts as values.'
    ),
});
export type PersonalizedFinancialAdviceInput = z.infer<
  typeof PersonalizedFinancialAdviceInputSchema
>;

const PersonalizedFinancialAdviceOutputSchema = z.object({
  summary: z.string().describe("A brief, one-sentence summary of the user's financial health."),
  recommendations: z.array(z.string()).describe('A list of 3-5 crisp, actionable recommendations as bullet points.'),
});
export type PersonalizedFinancialAdviceOutput = z.infer<
  typeof PersonalizedFinancialAdviceOutputSchema
>;

export async function getPersonalizedFinancialAdvice(
  input: PersonalizedFinancialAdviceInput
): Promise<PersonalizedFinancialAdviceOutput> {
  return personalizedFinancialAdviceFlow(input);
}

const PromptInputSchema = z.object({
    income: z.number(),
    spendingDetails: z.string(),
});

const prompt = ai.definePrompt({
  name: 'personalizedFinancialAdvicePrompt',
  input: {schema: PromptInputSchema},
  output: {schema: PersonalizedFinancialAdviceOutputSchema},
  prompt: `You are a personal finance advisor for a user in India. Analyze the user's income and spending habits to provide personalized recommendations for saving money. All monetary values are in Indian Rupees (INR).

Your response must be crisp, straightforward, and encouraging.

Income: ₹{{{income}}}
Spending by Category:
{{{spendingDetails}}}

Based on this information, provide:
1. A one-sentence summary of the user's financial health.
2. A list of 3-5 specific, actionable steps the user can take to reduce spending and increase savings. These should be bullet points.
`,
});

const personalizedFinancialAdviceFlow = ai.defineFlow(
  {
    name: 'personalizedFinancialAdviceFlow',
    inputSchema: PersonalizedFinancialAdviceInputSchema,
    outputSchema: PersonalizedFinancialAdviceOutputSchema,
  },
  async input => {
    const spendingDetails = Object.entries(input.spendingByCategory)
      .map(([category, amount]) => `  - ${category}: ₹${amount.toLocaleString('en-IN')}`)
      .join('\n');
      
    const {output} = await prompt({
        income: input.income,
        spendingDetails: spendingDetails,
    });
    return output!;
  }
);

require('dotenv').config();
console.log(process.env.SUMMARIZER)
const useOpenAI = process.env.SUMMARIZER === 'openai';

const batchPrompt = `The following text contains multiple Power BI idea descriptions combined in a single string. Break them down and summarize each idea individually. For each idea, extract its core purpose or value, without dwelling on technical details or long explanations. Do not cut words. Be concise, but ensure clarity:\n\n`;
const finalPrompt = `Based on the following list of summarized Power BI ideas, analyze and extract the following insights:

1. **User Pain Points** – What common challenges or frustrations do users face?
2. **User Needs** – What are users ultimately trying to achieve or improve?
3. **What's Missing** – What functionalities, features, or support are currently lacking in Power BI?
4. **Recommended Solution Directions** – What changes, improvements, or additions would best address the gaps and user expectations?

Focus on clarity and theme-level insights rather than summarizing each idea again. Be concise and insightful.

Return your output strictly in the following JSON format:

{
  "painPoints": "string",
  "needs": "string",
  "missing": "string",
  "solutions": "string"
}

Summarized Ideas:`;

async function summarizeInBatches(ideas, limit = 15000) {
  const summaries = [];
  let currentText = '';

  for (const idea of ideas || []) {
    const desc = idea.description || '';
    if ((currentText + desc).length > limit && desc !== '') {
      console.log('🔄 Block Summary started..');
      const summary = await summarizeBlock(currentText,batchPrompt);
      summaries.push(summary);
      currentText = '';
    }
    currentText += desc + '\n\n';
  }

  console.log('🔄 Final Summary Started..');
  let finalSummary = '';
  if (currentText.trim()) {
    finalSummary = await summarizeBlock(currentText,finalPrompt,process.env.summary_model);
  } 
  console.log('🔄 Final Summary Finshed..');
  console.log(JSON.parse(finalSummary));
  return JSON.parse(finalSummary);
}

async function summarizeBlock(text,prompt,model = process.env.batch_model) {

  const { OpenAI } = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const response = await openai.chat.completions.create({
    model: model,
    messages: [{
      role: 'user',
      content: `${prompt}\n\n${text}`
    }],
    temperature: 0.3
  });

  let content = response.choices[0].message.content.trim();

  try {
    // Try to parse the response as JSON
    return content;
  } catch (e) {
    // If parsing fails, return a default JSON object
    return {
      painPoints: '',
      needs: '',
      missing: '',
      solutions: ''
    };
  }
}

module.exports = { summarizeInBatches };

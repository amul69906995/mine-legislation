const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

const SYSTEM_PROMPT = `
You are an expert Mining Legislation Assistant.

You will be given:
1. A user query
2. Retrieved legal text chunks from a vector database (top-k matches)

Your task is to generate a response STRICTLY following these rules:

---

### CORE RULES (MANDATORY)

1. Use ONLY the provided retrieved data to answer the query.
2. DO NOT use prior knowledge or general knowledge.
3. DO NOT hallucinate laws, sections, rules, penalties, or interpretations.
4. If the retrieved data does NOT contain enough information to answer the question, clearly say so.

---

### RELEVANCE CHECK (VERY IMPORTANT)

Before answering, determine whether the user query is:
- A mining legislation related question
- And whether the retrieved data is actually relevant

If the query is:
- A greeting (e.g., "hi", "hello", "how are you")
- Casual conversation
- Out of mining/legal domain
- Or the retrieved data is weak, generic, or irrelevant

THEN respond with exactly:

"I'm here to help with mining legislation questions. Please ask a question related to mining laws or regulations."

---

### WHEN DATA IS PARTIALLY RELEVANT

If the question is about mining legislation BUT:
- The retrieved data does not directly answer it
- Or lacks specific sections / rules

THEN respond with:

"The available legal data does not contain sufficient information to answer this question precisely."

---

### ANSWER STYLE (WHEN YOU CAN ANSWER)

When answering:
- Be concise, factual, and neutral
- Quote or paraphrase from the retrieved text
- Mention rule/section numbers if present
- Avoid assumptions
- Avoid legal advice language
- Avoid conclusions not supported by the text

---

### OUTPUT FORMAT (STRICT JSON)

Return ONLY valid JSON in this format:

{
  "answer": "<final answer text>",
}
`;

const MODEL_NAME = "gemini-2.5-flash";
function buildContextForLLM(chunks) {
    return chunks.map((c, i) => `
[Source ${i + 1}]
Document: ${c.fields.file_name}
Section: ${c.fields.section_title}
Jurisdiction: ${c.fields.jurisdiction_level}
Mineral Scope: ${c.fields.mineral_scope}

Text:
${c.fields.chunk_text}
`).join("\n\n");
}
function cleanJSON(text) {
    return text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();
}

async function getLlmResponse(query, chunks) {
    const context = buildContextForLLM(chunks);
    console.log(context)
    const fullContents = [
        {
            role: "user",
            parts: [
                {
                    text: `
                       USER QUERY:${query}RETRIEVED LEGAL CONTEXT:${context} Respond strictly according to system instructions.  `
                }
            ]
        }
    ];

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: fullContents,
            config: {
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
            }
        });
        let raw = response.text;
        const cleaned = cleanJSON(raw);
        const data = JSON.parse(cleaned);
        console.log(raw)
        console.log(data);
        return data.answer;
    } catch (error) {
        console.error("Error generating content", error.message);
    }
}
module.exports = getLlmResponse;
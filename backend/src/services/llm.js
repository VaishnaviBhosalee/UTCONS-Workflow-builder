const axios = require('axios');

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';
const MODEL = 'gemini-2.5-flash';

// Step-specific system prompts
const STEP_PROMPTS = {
    clean: `You are a text cleaning assistant. Your job is to:
1. Remove extra whitespace and normalize spacing
2. Fix basic grammar and punctuation errors
3. Correct obvious spelling mistakes
4. Preserve the original meaning and content completely
Return only the cleaned text, no explanations or preamble.`,

    summarize: `You are a summarization assistant. Your job is to:
1. Condense the input into approximately 5 lines
2. Capture the most important points and key ideas
3. Write in clear, concise prose
4. Preserve the essential meaning
Return only the summary, no explanations or preamble.`,

    keypoints: `You are a key points extraction assistant. Your job is to:
1. Extract the most important insights from the text
2. Present them as bullet points (using • or -)
3. Each bullet point should be concise and actionable
4. Aim for 3-7 key points
Return only the bullet points, no explanations or preamble.`,

    tag: `You are a text classification assistant. Your job is to:
1. Read the input text carefully
2. Classify it into exactly ONE of these categories: Technology, Finance, Health, Education, Other
3. Provide a brief 1-2 sentence justification
Return in this exact format:
Category: [CATEGORY]
Reason: [BRIEF JUSTIFICATION]`,
};

/**
 * Sleep helper for rate limiting
 * @param {number} ms milliseconds to sleep
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Call the Gemini LLM via OpenAI-compatible endpoint with retry and exponential backoff.
 * @param {string} stepKey - The step key (clean, summarize, keypoints, tag)
 * @param {string} text - The input text to process
 * @param {number} maxRetries - Maximum number of retries (default 4)
 * @returns {Promise<string>} The LLM output text
 */
const callLLM = async (stepKey, text, maxRetries = 4) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    const systemPrompt = STEP_PROMPTS[stepKey];
    if (!systemPrompt) {
        throw new Error(`Unknown step key: ${stepKey}`);
    }

    const payload = {
        model: MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 1024,
    };

    let lastError;
    let delay = 1000; // Start with 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await axios.post(
                `${GEMINI_BASE_URL}/chat/completions`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                }
            );

            const content = response.data?.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error('Empty response from LLM');
            }

            return content.trim();
        } catch (error) {
            lastError = error;

            // Check for rate limiting (429) or server errors (5xx) — retry these
            const status = error.response?.status;
            const shouldRetry = status === 429 || (status >= 500 && status < 600);

            if (shouldRetry && attempt < maxRetries) {
                const jitter = Math.random() * 500; // Up to 500ms jitter
                const backoffDelay = delay + jitter;
                console.log(`LLM request failed (${status}), retrying in ${Math.round(backoffDelay)}ms (attempt ${attempt}/${maxRetries})`);
                await sleep(backoffDelay);
                delay *= 2; // Exponential backoff: 1s, 2s, 4s, 8s
                continue;
            }

            // Non-retriable error — throw immediately
            break;
        }
    }

    // All retries exhausted
    const errorMessage = lastError?.response?.data?.error?.message || lastError?.message || 'Unknown LLM error';
    throw new Error(`LLM call failed after ${maxRetries} attempts: ${errorMessage}`);
};

/**
 * Check if the LLM is reachable by making a minimal request
 * @returns {Promise<{reachable: boolean, latencyMs: number, error?: string}>}
 */
const checkLLMHealth = async () => {
    const startTime = Date.now();
    try {
        await callLLM('tag', 'Hello', 1);
        return { reachable: true, latencyMs: Date.now() - startTime };
    } catch (error) {
        return {
            reachable: false,
            latencyMs: Date.now() - startTime,
            error: error.message,
        };
    }
};

module.exports = { callLLM, checkLLMHealth, sleep };

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// Get the model instance with API key
function getModel() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

    // IMPORTANT:
    // - In dev, Vite injects VITE_* variables at runtime.
    // - In production build, the value is baked into the bundle at build time.
    // If the key isn't present, we fall back to simple heuristics so the app still works.
    if (!apiKey) return null;

    return new ChatOpenAI({
        // @langchain/openai v1 uses `model`, not `modelName`
        model: "gpt-4o-mini",
        temperature: 0.2,
        apiKey,
    });
}

function heuristicIntent(prompt) {
    const p = String(prompt || "").toLowerCase();
    const training = ["training", "course", "seminar", "workshop", "learn", "certification", "bootcamp"];
    if (training.some((k) => p.includes(k))) return { intent: "training", confidence: 55 };
    return { intent: "job", confidence: 55 };
}

function heuristicJobParams(prompt) {
    return {
        location: "Cebu",
        query: String(prompt || "").slice(0, 120),
        skills: [],
        jobType: null,
        experience: null,
    };
}

function heuristicTrainingParams(prompt) {
    return {
        topic: String(prompt || "").slice(0, 120),
        location: "Cebu",
        level: null,
        format: null,
    };
}

/**
 * Routes user intent to determine if they're looking for jobs or training
 * @param {string} prompt - User's natural language prompt
 * @returns {Promise<{intent: string, confidence: number}>}
 */
export async function routeUserIntent(prompt) {
    const model = getModel();
    if (!model) return heuristicIntent(prompt);

    const messages = [
        new SystemMessage(`You are an intent classifier. Analyze the user's prompt and determine if they're looking for:
- "job" - job opportunities, employment, positions, work
- "training" - seminars, courses, workshops, learning opportunities

Respond with ONLY a JSON object: {"intent": "job" or "training", "confidence": 0-100}`),
        new HumanMessage(prompt)
    ];

    try {
        const response = await model.invoke(messages);
        const parsed = JSON.parse(response.content);
        return {
            intent: parsed.intent || 'job',
            confidence: parsed.confidence || 70
        };
    } catch (error) {
        console.error('Intent routing error:', error);
        return heuristicIntent(prompt);
    }
}

/**
 * Job search agent that extracts parameters
 * @param {string} prompt - User's natural language prompt
 * @returns {Promise<Object>}
 */
export async function jobSearchAgent(prompt) {
    const model = getModel();
    if (!model) return heuristicJobParams(prompt);

    const messages = [
        new SystemMessage(`You are a job search parameter extractor. Extract the following from the user's prompt:
- location: city name (default: "Cebu")
- query: job title or keywords
- skills: array of skills mentioned
- jobType: remote, full-time, part-time, freelance, or null
- experience: entry, mid, senior, or null

Respond with ONLY a JSON object with these fields.`),
        new HumanMessage(prompt)
    ];

    try {
        const response = await model.invoke(messages);
        const params = JSON.parse(response.content);
        
        return {
            location: params.location || 'Cebu',
            query: params.query || '',
            skills: params.skills || [],
            jobType: params.jobType || null,
            experience: params.experience || null
        };
    } catch (error) {
        console.error('Job search agent error:', error);
        return heuristicJobParams(prompt);
    }
}

/**
 * Training search agent that extracts parameters for seminar/course search
 * @param {string} prompt - User's natural language prompt
 * @returns {Promise<Object>}
 */
export async function trainingSearchAgent(prompt) {
    const model = getModel();
    if (!model) return heuristicTrainingParams(prompt);

    const messages = [
        new SystemMessage(`You are a training/seminar search parameter extractor. Extract:
- topic: main subject or skill area
- location: city name (default: "Cebu")
- level: beginner, intermediate, advanced, or null
- format: online, in-person, hybrid, or null

Respond with ONLY a JSON object with these fields.`),
        new HumanMessage(prompt)
    ];

    try {
        const response = await model.invoke(messages);
        const params = JSON.parse(response.content);
        
        return {
            topic: params.topic || '',
            location: params.location || 'Cebu',
            level: params.level || null,
            format: params.format || null
        };
    } catch (error) {
        console.error('Training search agent error:', error);
        return heuristicTrainingParams(prompt);
    }
}

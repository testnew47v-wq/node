/**
 * utils/aiEngineError.js
 * Turns an axios error from a call to the FastAPI AI Engine into a clean
 * { status, message } pair for the Flutter client, and logs the REAL cause
 * so it shows up in the Vercel runtime logs.
 *
 * Use it in any controller that talks to FastAPI (predict, chat, ...):
 *   const { status, message } = mapAiEngineError(error, 'Chat Controller');
 *   return res.status(status).json({ success: false, message });
 */
function mapAiEngineError(error, context = 'AI Engine') {
    // FastAPI answered, but with an error status.
    if (error.response) {
        const data = error.response.data || {};
        console.error(`[${context}] FastAPI responded ${error.response.status}:`, JSON.stringify(data));

        let message = 'The AI engine returned an error.';
        if (data.message) {
            message = data.message;
        } else if (typeof data.detail === 'string') {
            message = data.detail;
        } else if (Array.isArray(data.detail)) {
            message = 'Invalid input was sent to the AI engine.';
        }
        return { status: error.response.status, message };
    }

    // No response at all: timeout, DNS failure, connection refused/reset.
    console.error(`[${context}] No response from FastAPI:`, error.code, error.message);
    const unreachable = ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'];
    if (unreachable.includes(error.code)) {
        return {
            status: 503,
            message: 'The AI engine is starting up. Please try again in about a minute.',
        };
    }

    // Anything else is a bug on our side (for example an invalid URL
    // because an environment variable is missing).
    return { status: 500, message: 'Internal server error while contacting the AI engine.' };
}

module.exports = { mapAiEngineError };

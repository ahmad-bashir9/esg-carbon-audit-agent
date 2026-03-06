const API_BASE = '/api';

class ApiError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });

    if (options.responseType === 'blob') {
        if (!res.ok) {
            const text = await res.text().catch(() => 'Request failed');
            throw new ApiError(text, res.status);
        }
        return res.blob();
    }

    const json = await res.json();
    if (!res.ok || json.success === false) {
        throw new ApiError(json.error || `Request failed (${res.status})`, res.status, json);
    }
    return json;
}

export const api = {
    get: (endpoint) => request(endpoint),
    post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
    del: (endpoint) => request(endpoint, { method: 'DELETE' }),
    upload: async (endpoint, formData) => {
        const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', body: formData });
        const json = await res.json();
        if (!res.ok || json.success === false) {
            throw new ApiError(json.error || 'Upload failed', res.status, json);
        }
        return json;
    },
    blob: (endpoint) => request(endpoint, { responseType: 'blob' }),
};

export { ApiError };

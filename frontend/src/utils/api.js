const API_BASE = import.meta.env.VITE_API_URL || '/api';

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
    let res;

    try {
        res = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options,
        });
    } catch (err) {
        throw new ApiError(
            'Cannot reach the server. Please check your connection.',
            0,
        );
    }

    if (options.responseType === 'blob') {
        if (!res.ok) {
            const text = await res.text().catch(() => 'Request failed');
            throw new ApiError(text, res.status);
        }
        return res.blob();
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        throw new ApiError(
            'Server returned an unexpected response. The backend may still be starting up — please retry in a few seconds.',
            res.status,
        );
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
        let res;
        try {
            res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', body: formData });
        } catch (err) {
            throw new ApiError('Cannot reach the server.', 0);
        }
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
            throw new ApiError('Server returned an unexpected response.', res.status);
        }
        const json = await res.json();
        if (!res.ok || json.success === false) {
            throw new ApiError(json.error || 'Upload failed', res.status, json);
        }
        return json;
    },
    blob: (endpoint) => request(endpoint, { responseType: 'blob' }),
};

export { ApiError };

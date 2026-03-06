export const SCOPE_LABELS = {
    1: { short: 'Direct', full: 'Direct Emissions', subtitle: 'Fuel, Fleet & On-site', option: 'Direct — Fuel & Fleet' },
    2: { short: 'Energy', full: 'Energy Emissions', subtitle: 'Electricity & Heat', option: 'Energy — Electricity & Heat' },
    3: { short: 'Supply Chain', full: 'Supply Chain', subtitle: 'Suppliers, Travel & Logistics', option: 'Supply Chain — Transport & Travel' },
};

export function scopeLabel(scope, variant = 'short') {
    const entry = SCOPE_LABELS[scope];
    if (!entry) return `Scope ${scope}`;
    return entry[variant] || entry.short;
}

export function formatNum(n) {
    if (!n && n !== 0) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function formatNumFull(n) {
    if (n === undefined || n === null) return '\u2014';
    return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function safePercent(value, total) {
    if (!total || total === 0) return 0;
    return (value / total) * 100;
}

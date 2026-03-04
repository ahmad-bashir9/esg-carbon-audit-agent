// ── GHG Protocol Emission Factors ──────────────────────────────────
// Sources: EPA, DEFRA, GHG Protocol
// All factors in kg CO2e per unit specified

export const EMISSION_FACTORS = {
    // ─── Scope 1: Direct Emissions ──────────────────────────────────
    fuels: {
        'Diesel': { factor: 2.68, unit: 'liter', description: 'Diesel combustion (mobile)' },
        'Gasoline': { factor: 2.31, unit: 'liter', description: 'Gasoline combustion (mobile)' },
        'Natural Gas': { factor: 5.30, unit: 'therm', description: 'Natural gas combustion (stationary)' },
        'Propane': { factor: 5.74, unit: 'gallon', description: 'Propane/LPG combustion' },
        'Fuel Oil': { factor: 2.96, unit: 'liter', description: 'Fuel oil combustion' },
        'Coal': { factor: 2450, unit: 'ton', description: 'Coal combustion' },
    },

    // ─── Scope 2: Indirect Energy ───────────────────────────────────
    electricity: {
        'US Average': { factor: 0.417, unit: 'kWh', description: 'US grid average' },
        'EU Average': { factor: 0.276, unit: 'kWh', description: 'EU grid average' },
        'China Average': { factor: 0.581, unit: 'kWh', description: 'China grid average' },
        'India Average': { factor: 0.708, unit: 'kWh', description: 'India grid average' },
        'Default': { factor: 0.417, unit: 'kWh', description: 'Default grid factor' },
    },
    steam: {
        'Default': { factor: 0.0283, unit: 'pound', description: 'Purchased steam' },
    },

    // ─── Scope 3: Value Chain ──────────────────────────────────────
    transport: {
        'Road Freight': { factor: 0.1028, unit: 'ton-km', description: 'HGV road freight' },
        'Rail Freight': { factor: 0.0278, unit: 'ton-km', description: 'Rail freight' },
        'Ocean Freight': { factor: 0.0158, unit: 'ton-km', description: 'Container ship freight' },
        'Air Freight': { factor: 0.6023, unit: 'ton-km', description: 'Air cargo freight' },
    },
    businessTravel: {
        'Flight (Economy)': { factor: 0.156, unit: 'passenger-km', description: 'Economy class flight' },
        'Flight (Business)': { factor: 0.434, unit: 'passenger-km', description: 'Business class flight' },
        'Train': { factor: 0.037, unit: 'passenger-km', description: 'Rail travel' },
        'Car': { factor: 0.171, unit: 'passenger-km', description: 'Car travel' },
    },
    commute: {
        'Car': { factor: 0.171, unit: 'km', description: 'Employee car commute' },
        'Public Transit': { factor: 0.089, unit: 'km', description: 'Public transit commute' },
    },
    materials: {
        'Raw Steel': { factor: 1850, unit: 'ton', description: 'Steel production (BOF avg)' },
        'Polymer Resin': { factor: 3400, unit: 'ton', description: 'Polymer resin manufacturing' },
        'Cardboard Packaging': { factor: 690, unit: 'ton', description: 'Corrugated cardboard' },
        'Industrial Solvents': { factor: 2100, unit: 'ton', description: 'Chemical solvents' },
        'Default': { factor: 1000, unit: 'ton', description: 'Default upstream material' },
    },
    waste: {
        'Landfill': { factor: 587, unit: 'ton', description: 'Waste to landfill' },
        'Recycled': { factor: 21.3, unit: 'ton', description: 'Waste recycled' },
        'Hazardous': { factor: 1250, unit: 'ton', description: 'Hazardous waste treatment' },
    },
};

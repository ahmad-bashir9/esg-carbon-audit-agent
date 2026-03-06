export const VERTICALS = {
    logistics: {
        id: 'logistics',
        label: 'Logistics & Freight',
        emissionFactors: [
            { activity_type: 'road_freight_articulated', unit: 'tonne-km', kg_co2e_per_unit: 0.0962, source: 'DEFRA', year: 2024, scope: 1 },
            { activity_type: 'road_freight_rigid', unit: 'tonne-km', kg_co2e_per_unit: 0.12, source: 'DEFRA', year: 2024, scope: 1 },
            { activity_type: 'rail_freight', unit: 'tonne-km', kg_co2e_per_unit: 0.0280, source: 'DEFRA', year: 2024, scope: 1 },
            { activity_type: 'air_freight', unit: 'tonne-km', kg_co2e_per_unit: 1.044, source: 'DEFRA', year: 2024, scope: 3 },
            { activity_type: 'sea_freight', unit: 'tonne-km', kg_co2e_per_unit: 0.0116, source: 'DEFRA', year: 2024, scope: 3 },
            { activity_type: 'refrigerant_r134a', unit: 'kg', kg_co2e_per_unit: 1430, source: 'EPA', year: 2024, scope: 1 },
            { activity_type: 'refrigerant_r404a', unit: 'kg', kg_co2e_per_unit: 3922, source: 'EPA', year: 2024, scope: 1 },
        ],
        scopeMapping: {
            'road_freight_articulated': 1,
            'road_freight_rigid': 1,
            'rail_freight': 1,
            'air_freight': 3,
            'sea_freight': 3,
            'refrigerant_r134a': 1,
            'refrigerant_r404a': 1,
        },
        terminology: {
            'dashboard.scope1_label': 'Transport Activities',
            'dashboard.fuel_combustion': 'Fleet Fuel',
            'data_manager.scope1_mobile': 'Fleet Operations',
            'reports.scope1_title': 'Direct Logistics Emissions',
        },
        report_templates: [
            { id: 'csrd_transport_annex', name: 'CSRD Transport Annex', description: 'Annex for CSRD transport-related disclosures under ESRS E1.' },
            { id: 'ghg_protocol_logistics', name: 'GHG Protocol Logistics', description: 'GHG Protocol guidance for logistics and freight operations.' },
        ]
    },
    default: {
        id: 'default',
        label: 'General Enterprise',
        terminology: {
            'dashboard.scope1_label': 'Scope 1 (Direct)',
            'dashboard.fuel_combustion': 'Fuel Combustion',
            'data_manager.scope1_mobile': 'Mobile Sources',
            'reports.scope1_title': 'Direct Emissions',
        }
    }
};

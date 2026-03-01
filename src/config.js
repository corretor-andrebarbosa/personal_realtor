
import { systemConfig } from './system-config';

export const config = {
    // Configurações de Manutenção
    maintenance: {
        enabled: false, // Mude para true para ativar o modo manutenção
        returnDate: "2026-02-18T18:00:00" // Data prevista de retorno (ISO string)
    },

    // Configurações do Site (lidas do system-config centralizado)
    siteName: systemConfig.brandName,
    contactEmail: systemConfig.email,

    // Se precisar de chaves de API, coloque aqui (mas cuidado com dados sensíveis no frontend)
    features: {
        advancedFilters: true,
        mapView: false
    }
};

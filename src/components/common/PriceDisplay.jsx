
import React, { useState, useEffect } from 'react';
import { getExchangeRates, getUserCurrency, formatCurrency } from '../../lib/currency';
import { translations } from '../../translations';

const PriceDisplay = ({ brlValue, lang, propertyConsultText, isRent = false, priceType = 'fixo' }) => {
    const [localPrice, setLocalPrice] = useState(null);
    const [currencyInfo, setCurrencyInfo] = useState({ code: 'BRL', country: 'BR' });
    const t = (key) => translations[lang][key] || translations['pt'][key] || key;

    useEffect(() => {
        if (!brlValue) return;

        let isMounted = true;

        const loadCurrency = async () => {
            const info = await getUserCurrency();
            if (!isMounted) return;
            setCurrencyInfo(info);

            if (info.code && info.code !== 'BRL') {
                const rates = await getExchangeRates();
                if (rates && rates[info.code.toLowerCase()]) {
                    const rate = rates[info.code.toLowerCase()];
                    setLocalPrice(brlValue * rate);
                }
            }
        };

        loadCurrency();
        return () => { isMounted = false; };
    }, [brlValue]);

    if (!brlValue) {
        return <span className="text-lg font-bold">{propertyConsultText}</span>;
    }

    const formattedBRL = `R$ ${brlValue.toLocaleString('pt-BR')}${isRent ? t('prop_month') : ''}`;
    const prefix = priceType === 'a_partir_de'
        ? <span className="text-xs font-medium opacity-90 block leading-tight">{t('price_from')}</span>
        : null;

    if (!localPrice || currencyInfo.code === 'BRL') {
        return (
            <div>
                {prefix}
                <span className="text-lg font-bold">{formattedBRL}</span>
            </div>
        );
    }

    const formattedLocal = formatCurrency(localPrice, currencyInfo.code, lang === 'pt' ? 'pt-BR' : lang);

    return (
        <div>
            {prefix}
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                <span className="text-lg font-bold">{formattedBRL}</span>
                <span className="text-xs font-semibold opacity-80 whitespace-nowrap">
                    ({formattedLocal} {t('prop_approx')})
                </span>
            </div>
        </div>
    );
};

export default PriceDisplay;

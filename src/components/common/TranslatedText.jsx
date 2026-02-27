
import React, { useState, useEffect } from 'react';
import { translateText } from '../../lib/translator';

/**
 * Component that automatically translates its children if the current language is not Portuguese.
 * It uses a loading state to avoid flickering and caches results in localStorage.
 */
const TranslatedText = ({ children, lang }) => {
    const [content, setContent] = useState(children);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!children || lang === 'pt') {
            setContent(children);
            return;
        }

        let isMounted = true;

        const performTranslation = async () => {
            setLoading(true);
            const result = await translateText(children, lang);
            if (isMounted) {
                setContent(result);
                setLoading(false);
            }
        };

        performTranslation();

        return () => {
            isMounted = false;
        };
    }, [children, lang]);

    if (loading) {
        return <span className="opacity-50 animate-pulse">{content}</span>;
    }

    return <>{content}</>;
};

export default TranslatedText;

// Gera slugs de URL amigáveis para SEO (mesma lógica usada no backfill SQL).
// Formato: estado-cidade-bairro-quartos-destaque-id
// Ex.: /properties/pb-joao-pessoa-jardim-oceania-3-quartos-vista-mar-definitiva-e-panoramica-4
//
// O "destaque" é o único trecho subjetivo do slug — o que realmente vende o
// imóvel (vista, acabamento, condomínio...) não dá pra extrair com certeza
// de um texto de marketing livre, então ele é editável no formulário do
// imóvel. `suggestSlugFeature` só dá um ponto de partida pra você editar.

export const slugify = (str) =>
    String(str || '')
        .normalize('NFD').replace(/\p{Diacritic}/gu, '')
        .toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

// Palavras sem valor de busca — removidas da sugestão automática de destaque.
const STOPWORDS = new Set([
    'de', 'da', 'do', 'das', 'dos', 'com', 'para', 'por', 'em', 'no', 'na',
    'nos', 'nas', 'e', 'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
    'ao', 'aos', 'à', 'às', 'que', 'se',
]);

const removeStopwords = (slug) =>
    slug.split('-').filter(w => w && !STOPWORDS.has(w)).join('-');

// Corta no limite de caracteres sem partir uma palavra ao meio.
const truncateAtWord = (slug, maxLen) => {
    if (slug.length <= maxLen) return slug;
    const cut = slug.slice(0, maxLen);
    const lastDash = cut.lastIndexOf('-');
    return (lastDash > 0 ? cut.slice(0, lastDash) : cut).replace(/-+$/, '');
};

// Endereço no formato "Bairro, Cidade - Estado" (padrão usado no cadastro).
// Também aceita formatos parciais (sem estado, sem bairro etc.) sem quebrar.
export const parseAddress = (address) => {
    const [rawNeighborhood = '', rawRest = ''] = String(address || '').split(',');
    const neighborhood = rawNeighborhood.trim();

    const rest = rawRest.trim();
    const lastDash = rest.lastIndexOf('-');
    const city = (lastDash > -1 ? rest.slice(0, lastDash) : rest).trim();
    const state = (lastDash > -1 ? rest.slice(lastDash + 1) : '').trim();

    return { neighborhood, city, state };
};

// Sugestão automática de destaque a partir do título — só um ponto de
// partida pra editar no formulário, não o valor final. Curta de propósito:
// é mais fácil completar uma sugestão curta do que cortar uma longa.
export const suggestSlugFeature = (title, type, rooms) => {
    let feature = removeStopwords(slugify(title));
    if (type) feature = feature.split('-').filter(w => w !== slugify(type)).join('-');
    if (Number(rooms) > 0) {
        feature = feature
            .replace(new RegExp(`(^|-)${Number(rooms)}-quartos(-|$)`), '$1')
            .replace(/^-+|-+$/g, '');
    }
    return truncateAtWord(feature, 45);
};

// Parte legível do slug, na ordem pedida: estado > cidade > bairro > quartos > destaque.
// `feature` é o texto que o corretor escolheu no formulário (já vem pronto,
// só passa por slugify); se vier vazio, cai pra sugestão automática.
export const buildPropertySlugBase = ({ type, rooms, address, title, feature } = {}) => {
    const { neighborhood, city, state } = parseAddress(address);
    const roomsPart = Number(rooms) > 0 ? `${Number(rooms)} quartos` : '';

    const locationAndRooms = slugify(
        [state, city, neighborhood, roomsPart].filter(Boolean).join(' ')
    );

    const featureSlug = (feature && feature.trim())
        ? slugify(feature)
        : suggestSlugFeature(title, type, rooms);

    const base = [locationAndRooms, featureSlug].filter(Boolean).join('-');
    return base || slugify(title) || 'imovel';
};

// Slug final sempre termina com o id — garante unicidade sem precisar
// checar colisão no banco, e preserva a URL antiga (/properties/4) como
// sufixo, então links já indexados continuam resolvendo o imóvel certo.
export const buildPropertySlug = (property = {}, id) => {
    const base = buildPropertySlugBase(property);
    return `${base}-${id}`;
};

// Extrai o id numérico do fim de um slug ("...panoramica-4" -> "4").
// Também aceita um id puro ("4" -> "4"), para compatibilidade com URLs antigas.
export const extractIdFromSlug = (value) => {
    const match = String(value || '').match(/-(\d+)$/);
    if (match) return match[1];
    return /^\d+$/.test(String(value || '')) ? String(value) : null;
};

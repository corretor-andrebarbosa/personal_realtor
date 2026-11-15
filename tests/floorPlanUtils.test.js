// Testes das regras puras da planta baixa. Rodar com: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    cleanName,
    isValidName,
    normalizePhone,
    isValidEmail,
    toOpenableUrl,
    errorKeyFor,
    readUnlockedFloorPlan,
    rememberUnlockedFloorPlan,
    UNLOCK_STORAGE_KEY,
    UNLOCK_TTL_MS,
} from '../src/lib/floorPlanUtils.js';

// Imitação mínima do localStorage
const fakeStorage = (initial = {}) => {
    const data = { ...initial };
    return {
        getItem: (key) => (key in data ? data[key] : null),
        setItem: (key, value) => { data[key] = String(value); },
        dump: () => data,
    };
};

test('nome: limpa marcação e caracteres de controle', () => {
    assert.equal(cleanName('  Maria <b>Silva</b>\n'), 'Maria bSilva/b');
    assert.equal(cleanName(null), '');
    assert.equal(isValidName('Zé'), true);
    assert.equal(isValidName(' J '), false);
    assert.equal(isValidName('a'.repeat(81)), false);
});

test('telefone brasileiro recebe o código 55', () => {
    assert.deepEqual(normalizePhone('(83) 99682-8008'), { valid: true, digits: '5583996828008', international: false });
    assert.deepEqual(normalizePhone('83 3222-1234'), { valid: true, digits: '558332221234', international: false });
    assert.equal(normalizePhone('5583996828008').digits, '5583996828008');
});

test('telefone internacional mantém os dígitos', () => {
    assert.deepEqual(normalizePhone('+49 151 23456789'), { valid: true, digits: '4915123456789', international: true });
    assert.deepEqual(normalizePhone('0044 20 7946 0958'), { valid: true, digits: '442079460958', international: true });
    assert.equal(normalizePhone('+55 83 99682-8008').digits, '5583996828008');
});

test('telefone inválido é recusado', () => {
    assert.equal(normalizePhone('99682-8008').valid, false); // sem DDD
    assert.equal(normalizePhone('').valid, false);
    assert.equal(normalizePhone(null).valid, false);
    assert.equal(normalizePhone('+1234567890123456').valid, false); // mais de 15 dígitos
});

test('em outro idioma o código do país é obrigatório', () => {
    assert.equal(normalizePhone('0151 23456789', { requireCountryCode: true }).valid, false);
    assert.equal(normalizePhone('+49 151 23456789', { requireCountryCode: true }).valid, true);
    assert.equal(normalizePhone('0049 151 23456789', { requireCountryCode: true }).valid, true);
});

test('e-mail é opcional, mas precisa ser válido quando preenchido', () => {
    assert.equal(isValidEmail(''), true);
    assert.equal(isValidEmail('   '), true);
    assert.equal(isValidEmail('maria@email.com'), true);
    assert.equal(isValidEmail('nao-e-email'), false);
    assert.equal(isValidEmail('a b@c.com'), false);
    assert.equal(isValidEmail(`${'a'.repeat(120)}@x.com`), false);
});

test('link: só http(s); Google Drive vira /view', () => {
    assert.equal(toOpenableUrl('javascript:alert(1)'), '');
    assert.equal(toOpenableUrl('ftp://x.y/z.pdf'), '');
    assert.equal(toOpenableUrl(''), '');
    assert.equal(toOpenableUrl(null), '');
    assert.equal(toOpenableUrl(' https://site.com/planta.pdf '), 'https://site.com/planta.pdf');
    assert.equal(
        toOpenableUrl('https://drive.google.com/file/d/ABC_123-x/preview?usp=sharing'),
        'https://drive.google.com/file/d/ABC_123-x/view'
    );
    assert.equal(
        toOpenableUrl('https://drive.google.com/open?id=ABC123&usp=drive'),
        'https://drive.google.com/file/d/ABC123/view'
    );
    // parâmetro "id" em outro site não é tratado como arquivo do Drive
    assert.equal(toOpenableUrl('https://site.com/baixar?id=77'), 'https://site.com/baixar?id=77');
});

test('códigos de erro do banco viram chaves de tradução', () => {
    assert.equal(errorKeyFor('invalid_phone'), 'fp_err_phone');
    assert.equal(errorKeyFor('consent_required'), 'fp_err_consent');
    assert.equal(errorKeyFor('not_available'), 'fp_err_unavailable');
    assert.equal(errorKeyFor('rate_limited'), 'fp_err_generic');
    assert.equal(errorKeyFor('network'), 'fp_err_generic');
    assert.equal(errorKeyFor(undefined), 'fp_err_generic');
});

test('planta liberada é lembrada por imóvel e vence em 7 dias', () => {
    const storage = fakeStorage();
    const now = 1_800_000_000_000;

    assert.equal(readUnlockedFloorPlan(storage, 101, now), '');
    assert.equal(rememberUnlockedFloorPlan(storage, 101, 'https://site.com/planta.pdf', now), true);
    assert.equal(readUnlockedFloorPlan(storage, 101, now + 1000), 'https://site.com/planta.pdf');
    assert.equal(readUnlockedFloorPlan(storage, '101', now + 1000), 'https://site.com/planta.pdf');
    assert.equal(readUnlockedFloorPlan(storage, 102, now + 1000), '');
    assert.equal(readUnlockedFloorPlan(storage, 101, now + UNLOCK_TTL_MS + 1), '');

    // gravar outro imóvel depois do prazo descarta a entrada vencida
    rememberUnlockedFloorPlan(storage, 102, 'https://site.com/outra.pdf', now + UNLOCK_TTL_MS + 5);
    assert.deepEqual(Object.keys(JSON.parse(storage.dump()[UNLOCK_STORAGE_KEY])), ['102']);
});

test('armazenamento ausente, corrompido ou adulterado não quebra nem libera link inseguro', () => {
    assert.equal(readUnlockedFloorPlan(null, 101), '');
    assert.equal(rememberUnlockedFloorPlan(null, 101, 'https://x.y'), false);
    assert.equal(readUnlockedFloorPlan(fakeStorage({ [UNLOCK_STORAGE_KEY]: '{quebrado' }), 101), '');
    assert.equal(readUnlockedFloorPlan(fakeStorage({ [UNLOCK_STORAGE_KEY]: '[1,2]' }), 101), '');

    const tampered = fakeStorage({
        [UNLOCK_STORAGE_KEY]: JSON.stringify({ 101: { url: 'javascript:alert(1)', at: Date.now() } }),
    });
    assert.equal(readUnlockedFloorPlan(tampered, 101), '');

    const throwing = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('cheio'); } };
    assert.equal(readUnlockedFloorPlan(throwing, 101), '');
    assert.equal(rememberUnlockedFloorPlan(throwing, 101, 'https://x.y'), false);
});

/**
 * Landing page Parque Parahyba 1 — rastreamento Google Ads.
 *
 * - Guarda gclid / gbraid / wbraid da URL em cookie próprio de 90 dias.
 * - Carrega o gtag.js só depois que a página termina de carregar (não pesa no Lighthouse).
 * - Conversões: whatsapp_click (links wa.me / api.whatsapp.com), phone_click (tel:)
 *   e lead_form_submit (somente após resposta 200 do /api/lead).
 * - IDs vêm de /api/ads-config (variáveis de ambiente do Cloudflare Pages).
 * - Em localhost, ou com ?debug_ads=1 na URL, tudo é registrado no console.
 */
(function () {
    'use strict';

    var DEBUG = /^(localhost|127\.|192\.168\.)/.test(location.hostname) || /[?&]debug_ads=1/.test(location.search);
    var DIAS = 90;
    var config = null; // { adsId, conversions: { whatsapp, form, phone } }
    var fila = [];     // eventos disparados antes da configuração chegar
    var NOMES = { whatsapp: 'whatsapp_click', phone: 'phone_click', form: 'lead_form_submit' };

    function log() {
        if (DEBUG && window.console) console.log.apply(console, ['[ads]'].concat([].slice.call(arguments)));
    }

    // ---------- gclid ----------
    function lerCookie(nome) {
        var m = document.cookie.match(new RegExp('(?:^|; )' + nome + '=([^;]*)'));
        return m ? decodeURIComponent(m[1]) : '';
    }
    function gravarCookie(nome, valor) {
        document.cookie = nome + '=' + encodeURIComponent(valor) + '; path=/; max-age=' + (DIAS * 86400) +
            '; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
    }
    var params = new URLSearchParams(location.search);
    ['gclid', 'gbraid', 'wbraid'].forEach(function (k) {
        var v = (params.get(k) || '').trim();
        if (v && /^[\w-]{6,200}$/.test(v)) { gravarCookie('lp_' + k, v); log('capturado', k, v); }
    });

    window.lpTracking = {
        getGclid: function () {
            return lerCookie('lp_gclid') || lerCookie('gclid') || lerCookie('lp_gbraid') || lerCookie('lp_wbraid');
        }
    };

    // ---------- gtag ----------
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

    function carregarTag(adsId) {
        var s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(adsId);
        document.head.appendChild(s);
        window.gtag('js', new Date());
        window.gtag('config', adsId, { allow_enhanced_conversions: true });
        log('gtag carregado', adsId);
    }

    // Valor por prazo de compra: o lance automático aprende a buscar quem compra logo.
    var VALOR_POR_PRAZO = {
        'Imediatamente': 100, 'Em até 3 meses': 60, 'De 3 a 6 meses': 25,
        'Mais de 6 meses': 8, 'Só estou pesquisando': 2
    };
    var VALOR_PADRAO = { whatsapp: 30, phone: 30, form: 10 };

    function enviar(item) {
        var tipo = item.tipo;
        var valor = item.valor || VALOR_PADRAO[tipo] || 1;
        var sendTo = config && config.conversions && config.conversions[tipo];
        // evento nomeado: aparece no Tag Assistant
        window.gtag('event', NOMES[tipo], { event_category: 'lead', event_label: 'parque-parahyba-1' });
        if (sendTo) {
            window.gtag('event', 'conversion', { send_to: sendTo, value: valor, currency: 'BRL' });
            log('conversão enviada', NOMES[tipo], sendTo, 'valor', valor);
        } else {
            log('evento registrado, conversão NÃO enviada (rótulo vazio em /api/ads-config):', NOMES[tipo]);
        }
    }

    function registrar(tipo, valor) {
        var item = { tipo: tipo, valor: valor };
        if (config) enviar(item);
        else { fila.push(item); log('na fila até a configuração chegar:', NOMES[tipo]); }
    }

    function iniciar() {
        fetch('/api/ads-config', { credentials: 'omit' })
            .then(function (r) {
                var tipo = r.headers.get('content-type') || '';
                if (!r.ok || tipo.indexOf('json') === -1) throw new Error('HTTP ' + r.status + ' ' + tipo);
                return r.json();
            })
            .catch(function (e) {
                log('sem /api/ads-config (normal no Vite dev; use "npx wrangler pages dev"):', e.message);
                return { adsId: '', conversions: {} };
            })
            .then(function (c) {
                config = c || { adsId: '', conversions: {} };
                config.conversions = config.conversions || {};
                log('configuração', JSON.stringify(config));
                if (config.adsId) carregarTag(config.adsId);
                fila.splice(0).forEach(enviar);
            });
    }
    if (document.readyState === 'complete') setTimeout(iniciar, 0);
    else window.addEventListener('load', function () { setTimeout(iniciar, 0); });

    // ---------- cliques em WhatsApp e telefone ----------
    document.addEventListener('click', function (e) {
        var a = e.target && e.target.closest && e.target.closest('a[href]');
        if (!a) return;
        var href = a.getAttribute('href') || '';
        if (/^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(href)) registrar('whatsapp');
        else if (/^tel:/i.test(href)) registrar('phone');
    }, true);

    // ---------- formulário (evento disparado pelo script do formulário após HTTP 200) ----------
    document.addEventListener('lp:lead-enviado', function (e) {
        var tel = e.detail && e.detail.telefone;
        if (tel) {
            // Conversões otimizadas para leads: o gtag aplica hash SHA-256 antes de enviar.
            var digitos = String(tel).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
            window.gtag('set', 'user_data', { phone_number: '+55' + digitos });
        }
        registrar('form', VALOR_POR_PRAZO[e.detail && e.detail.prazo]);
    });
})();

/**
 * Landing page Parque Parahyba 1 — galeria em tela cheia.
 * Setas, teclado (← → Esc) e deslizar no celular. Sem JS, o link abre a foto normalmente.
 */
(function () {
    'use strict';

    var dialog = document.getElementById('lightbox');
    var links = Array.prototype.slice.call(document.querySelectorAll('.gallery-grid a'));
    if (!dialog || !links.length || typeof dialog.showModal !== 'function') return;

    var img = dialog.querySelector('img');
    var legenda = dialog.querySelector('figcaption');
    var atual = 0;

    function mostrar(i) {
        atual = (i + links.length) % links.length;
        var a = links[atual];
        var alt = a.querySelector('img').alt;
        img.src = a.href;
        img.alt = alt;
        legenda.textContent = alt + ' (' + (atual + 1) + '/' + links.length + ')';
        // pré-carrega a próxima
        new Image().src = links[(atual + 1) % links.length].href;
    }

    links.forEach(function (a, i) {
        a.addEventListener('click', function (e) {
            e.preventDefault();
            mostrar(i);
            dialog.showModal();
        });
    });

    dialog.querySelector('.lb-close').addEventListener('click', function () { dialog.close(); });
    dialog.querySelector('.lb-prev').addEventListener('click', function () { mostrar(atual - 1); });
    dialog.querySelector('.lb-next').addEventListener('click', function () { mostrar(atual + 1); });

    document.addEventListener('keydown', function (e) {
        if (!dialog.open) return;
        if (e.key === 'ArrowLeft') mostrar(atual - 1);
        if (e.key === 'ArrowRight') mostrar(atual + 1);
    });

    // clique fora da foto fecha
    dialog.addEventListener('click', function (e) {
        if (e.target === dialog || e.target.tagName === 'FIGURE') dialog.close();
    });

    // deslizar no celular
    var inicioX = null;
    dialog.addEventListener('touchstart', function (e) { inicioX = e.touches[0].clientX; }, { passive: true });
    dialog.addEventListener('touchend', function (e) {
        if (inicioX === null) return;
        var dx = e.changedTouches[0].clientX - inicioX;
        if (Math.abs(dx) > 50) mostrar(atual + (dx < 0 ? 1 : -1));
        inicioX = null;
    });
})();

/**
 * Landing page Parque Parahyba 1 — formulário de lead.
 *
 * Envia nome, telefone e prazo para /api/lead (Cloudflare Pages Function),
 * que grava na tabela `leads` do Supabase e envia e-mail.
 * O evento `lp:lead-enviado` só é disparado após resposta 200 do backend.
 */
(function () {
    'use strict';

    var form = document.getElementById('lead-form');
    if (!form) return;

    var statusEl = form.querySelector('.form-status');
    var button = form.querySelector('button[type="submit"]');

    function setStatus(msg, tipo) {
        statusEl.textContent = msg;
        statusEl.className = 'form-status' + (tipo ? ' ' + tipo : '');
    }

    function somenteDigitos(v) {
        return String(v || '').replace(/\D/g, '');
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        var nome = form.nome.value.trim();
        var telefone = somenteDigitos(form.telefone.value);
        var prazo = form.prazo.value;

        if (nome.length < 2) { setStatus('Informe seu nome.', 'err'); form.nome.focus(); return; }
        if (telefone.length < 10 || telefone.length > 13) { setStatus('Informe um telefone com DDD.', 'err'); form.telefone.focus(); return; }
        if (!prazo) { setStatus('Selecione em quanto tempo pretende comprar.', 'err'); form.prazo.focus(); return; }

        var payload = {
            nome: nome,
            telefone: telefone,
            prazo: prazo,
            website: form.website.value, // isca para robôs
            pagina: location.pathname,
            gclid: (window.lpTracking && window.lpTracking.getGclid()) || ''
        };

        button.disabled = true;
        setStatus('Enviando...');

        fetch('/api/lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(function (res) {
                if (res.status !== 200) throw new Error('HTTP ' + res.status);
                setStatus('Recebido! Vou te chamar em breve. — André', 'ok');
                form.reset();
                document.dispatchEvent(new CustomEvent('lp:lead-enviado', { detail: { prazo: prazo, telefone: telefone } }));
            })
            .catch(function () {
                setStatus('Não foi possível enviar agora. Fale comigo pelo WhatsApp logo abaixo.', 'err');
            })
            .then(function () {
                button.disabled = false;
            });
    });
})();

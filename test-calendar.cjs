const ANCHOR = new Date(2025, 3, 13, 12, 0, 0);
function isLeap(y) { if (y === 6000) return true; if (y === 6001) return false; return (y - 6000) % 3 === 0; }
function ml(m) { if (m === 13) return 29; return m % 2 !== 0 ? 30 : 29; }
function yl(y) { return isLeap(y) ? 383 : 354; }
function ysMs(y) { let ms = ANCHOR.getTime(); for (let i = 6000; i < y; i++) ms += yl(i) * 86400000; return ms; }
function sd(now) {
    const d = new Date(now); d.setHours(12, 0, 0, 0);
    const diffDays = Math.floor((d - ANCHOR) / 86400000);
    let year = 6000 + Math.floor(diffDays / 354.367);
    let ys = ysMs(year);
    while (d < ys) { year--; ys = ysMs(year); }
    let ny = ysMs(year + 1);
    while (d >= ny) { year++; ys = ny; ny = ysMs(year + 1); }
    let rem = Math.floor((d - ys) / 86400000);
    let month = 1; const max = isLeap(year) ? 13 : 12;
    while (month < max) { const ml2 = ml(month); if (rem < ml2) break; rem -= ml2; month++; }
    return { year, month, day: rem + 1 };
}

const hoje = sd(Date.now());
console.log('Hoje escritural:', JSON.stringify(hoje));
console.log('Shabbat?', [8, 15, 22, 29].includes(hoje.day));
console.log('Lua Nova?', hoje.day === 1);
console.log('');
console.log('Próximos dias apartados (30 dias):');
const FEASTS = [[1, 14, 14, 'Pessach'], [1, 15, 21, 'Chag HaMatzot'], [3, 8, 8, 'Shavuot'], [7, 10, 10, 'Yom Kippur'], [7, 15, 22, 'Sukkot']];
for (let i = 0; i <= 35; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const s = sd(d.getTime());
    const isS = [8, 15, 22, 29].includes(s.day);
    const isN = s.day === 1;
    const feast = FEASTS.find(([m, fs, fe]) => m === s.month && s.day >= fs && s.day <= fe);
    if (isS || isN || feast) {
        const nome = feast ? feast[3] : isS ? 'Shabbat' : (s.month === 1 ? 'Rosh Chodashim' : s.month === 7 ? 'Yom Teruah' : 'Rosh Chodesh');
        console.log('+' + i + 'd: ' + d.toLocaleDateString('pt-BR') + ' = Mês ' + s.month + ' Dia ' + s.day + ' → ' + nome);
    }
}

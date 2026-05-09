import { checkDay, getTodayStatus } from './src/lib/scripturalCalendar.js';

console.log('Testing 2026-05-04:');
const result = checkDay('2026-05-04');
console.log('checkDay result:', result);

console.log('\nTesting getTodayStatus:');
const todayStatus = getTodayStatus();
console.log('getTodayStatus result:', todayStatus);

// Testar dias adjacentes
console.log('\nTesting adjacent days:');
console.log('2026-05-02:', checkDay('2026-05-02'));
console.log('2026-05-03:', checkDay('2026-05-03'));
console.log('2026-05-04:', checkDay('2026-05-04'));
console.log('2026-05-05:', checkDay('2026-05-05'));
console.log('2026-05-08:', checkDay('2026-05-08'));
console.log('2026-05-09:', checkDay('2026-05-09'));

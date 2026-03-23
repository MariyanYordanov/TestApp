// Стъпка 60 — formatDate.js
// Споделена функция за форматиране на дата

// Форматира ISO дата стринг за показване в потребителски интерфейс
// Връща "—" при null, undefined, празен стринг или невалидна дата
export function formatDate(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('bg-BG', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

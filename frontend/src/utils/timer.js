// Стъпка 17 — timer.js
// Countdown timer utility.
// endTime се изчислява от duration-а подаден от сървъра (PublicTestResponse.duration).

// Създава countdown таймер — извиква onTick всяка секунда и onExpire при край
export function createTimer(totalSeconds, onTick, onExpire) {
    const endTime = Date.now() + totalSeconds * 1000;
    let stopped = false;

    // Показва началната стойност преди първия tick
    onTick(totalSeconds);

    const intervalId = setInterval(() => {
        if (stopped) return;

        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));

        if (remaining <= 0) {
            clearInterval(intervalId);
            onExpire();
        } else {
            onTick(remaining);
        }
    }, 1000);

    return {
        // Спира таймера и предотвратява по-нататъшни callbacks
        stop() {
            stopped = true;
            clearInterval(intervalId);
        },
    };
}

// Форматира секунди в "MM:SS" формат
export function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return `${mm}:${ss}`;
}

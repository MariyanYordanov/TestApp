// Тестове за utils/timer.js

import { createTimer, formatTime } from '../../utils/timer.js';

describe('formatTime — форматиране на секунди', () => {
    it('форматира 0 секунди като "00:00"', () => {
        expect(formatTime(0)).toBe('00:00');
    });

    it('форматира 90 секунди като "01:30"', () => {
        expect(formatTime(90)).toBe('01:30');
    });

    it('форматира 3600 секунди като "60:00"', () => {
        expect(formatTime(3600)).toBe('60:00');
    });

    it('форматира 65 секунди като "01:05"', () => {
        expect(formatTime(65)).toBe('01:05');
    });

    it('форматира 59 секунди като "00:59"', () => {
        expect(formatTime(59)).toBe('00:59');
    });

    it('форматира 600 секунди като "10:00"', () => {
        expect(formatTime(600)).toBe('10:00');
    });
});

describe('createTimer — countdown таймер', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date());
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('извиква onTick веднага с totalSeconds', () => {
        const onTick = vi.fn();
        const onExpire = vi.fn();
        createTimer(10, onTick, onExpire);
        expect(onTick).toHaveBeenCalledWith(10);
    });

    it('извиква onTick след 1 секунда с намалена стойност', () => {
        const onTick = vi.fn();
        const onExpire = vi.fn();
        createTimer(10, onTick, onExpire);
        vi.advanceTimersByTime(1000);
        expect(onTick).toHaveBeenCalledWith(9);
    });

    it('извиква onTick многократно при напредване на времето', () => {
        const onTick = vi.fn();
        const onExpire = vi.fn();
        createTimer(5, onTick, onExpire);
        vi.advanceTimersByTime(3000);
        // веднъж веднага + 3 пъти от интервала
        expect(onTick).toHaveBeenCalledTimes(4);
    });

    it('извиква onExpire при изтичане на времето', () => {
        const onTick = vi.fn();
        const onExpire = vi.fn();
        createTimer(3, onTick, onExpire);
        vi.advanceTimersByTime(3000);
        expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('не извиква onTick след изтичане (не подава 0)', () => {
        const onTick = vi.fn();
        const onExpire = vi.fn();
        createTimer(2, onTick, onExpire);
        vi.advanceTimersByTime(2000);
        // onTick не трябва да се е извикал с 0
        const calls = onTick.mock.calls.map(c => c[0]);
        expect(calls).not.toContain(0);
    });

    it('stop() предотвратява по-нататъшни callbacks', () => {
        const onTick = vi.fn();
        const onExpire = vi.fn();
        const timer = createTimer(10, onTick, onExpire);
        vi.advanceTimersByTime(2000);
        timer.stop();
        const callsAfterStop = onTick.mock.calls.length;
        vi.advanceTimersByTime(5000);
        // не трябва да има нови извиквания след stop
        expect(onTick.mock.calls.length).toBe(callsAfterStop);
        expect(onExpire).not.toHaveBeenCalled();
    });

    it('stop() не хвърля грешка при многократно извикване', () => {
        const timer = createTimer(10, vi.fn(), vi.fn());
        expect(() => {
            timer.stop();
            timer.stop();
        }).not.toThrow();
    });
});

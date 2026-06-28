import React, { useState, useEffect, useCallback } from 'react';
import { render } from '@testing-library/react';

// simulate the hook
const useServiceTimer = (duration, computedTimeStart) => {
    const totalSeconds = duration * 60;
    const isStarted = !!computedTimeStart;

    const getInitialElapsed = useCallback(() => {
        if (!computedTimeStart) return 0;
        const start = new Date(computedTimeStart).getTime();
        const now = new Date().getTime();
        const diffInSeconds = Math.floor((now - start) / 1000);
        return Math.max(0, Math.min(diffInSeconds, totalSeconds));
    }, [computedTimeStart, totalSeconds]);

    const [elapsedSeconds, setElapsedSeconds] = useState(getInitialElapsed());

    useEffect(() => {
        console.log("Setting initial elapsed");
        setElapsedSeconds(getInitialElapsed());
    }, [getInitialElapsed]);

    useEffect(() => {
        if (!isStarted) return;
        console.log("Setting interval");
        const interval = setInterval(() => {
            const newVal = getInitialElapsed();
            console.log("Interval tick, new val:", newVal);
            setElapsedSeconds(newVal);
        }, 1000);

        return () => clearInterval(interval);
    }, [isStarted, getInitialElapsed]);

    return elapsedSeconds;
};

const TestComponent = () => {
    // start 5 minutes ago
    const start = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const elapsed = useServiceTimer(60, start);
    console.log("Rendered with elapsed:", elapsed);
    return <div>{elapsed}</div>;
}

// Just a dummy file for the test

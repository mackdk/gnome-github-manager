import { PRIORITY_DEFAULT, source_remove, timeout_add_seconds } from '@gi-types/glib2';

import { Logger } from './Logger';

export type TimerTask = () => Promise<boolean>;

export class LimitedRetriableTimer {
    private static readonly LOGGER: Logger = new Logger('utils::LimitedRetriableTimer');

    public upperIntervalLimit?: number;

    public lowerIntervalLimit?: number;

    public _interval: number;

    public retryIntervals: number[];

    private retries: number;

    private currentInterval: number;

    private timerHandle?: number;

    private readonly task: TimerTask;

    public constructor(task: TimerTask, interval: number) {
        this.task = task;
        this._interval = interval;
        this.retryIntervals = [60, 120, 240, 480, 960, 1920, 3600];

        this.retries = 0;
        this.currentInterval = this._interval;
        this.timerHandle = undefined;
    }

    public start(initialDelay: number = 0): void {
        LimitedRetriableTimer.LOGGER.debug(
            'Timer is started. Executing first run with initial delay {0}s',
            initialDelay
        );

        // Reset the first timeout
        this.currentInterval = this._interval;

        // If no initial delay execute immediately
        if (initialDelay == 0) {
            this.runTaskAndSchedule();
        } else {
            // Otherwise schedule the first execution
            this.timerHandle = timeout_add_seconds(PRIORITY_DEFAULT, initialDelay, () => {
                this.runTaskAndSchedule();
                return false;
            });
        }
    }

    public stop(): void {
        if (!this.timerHandle) {
            return;
        }

        LimitedRetriableTimer.LOGGER.debug('Timer is stopped');
        source_remove(this.timerHandle);
        this.timerHandle = undefined;
        this.retries = 0;
    }

    public restart(initialDelay: number = 0): void {
        this.stop();
        this.start(initialDelay);
    }

    public get running(): boolean {
        return this.timerHandle !== undefined;
    }

    public get interval(): number {
        return this._interval;
    }

    public set interval(value: number) {
        this._interval = value;
        if (this.timerHandle) {
            this.restart();
        }
    }

    private runTaskAndSchedule(): void {
        this.task()
            .then((outcome: boolean) => {
                this.computeCurrentInterval(outcome);
                this.scheduleNextRun();
                LimitedRetriableTimer.LOGGER.debug(
                    'Next fetch execution scheduled in {0} seconds',
                    this.currentInterval
                );
            })
            .catch((err) => LimitedRetriableTimer.LOGGER.error('Unexpected error while executing timer task', err));
    }

    private scheduleNextRun(): void {
        this.stop();

        this.timerHandle = timeout_add_seconds(PRIORITY_DEFAULT, this.currentInterval, () => {
            this.runTaskAndSchedule();
            return false;
        });
    }

    private computeCurrentInterval(successful: boolean): void {
        if (successful) {
            this.currentInterval = this._interval;
            this.retries = 0;
        } else {
            this.retries++;
            this.currentInterval = this.retryIntervals[this.retries] ?? 3600;
        }

        // Limit the interval according to the limits, if specified
        this.currentInterval = Math.max(this.currentInterval, this.lowerIntervalLimit ?? Number.MIN_SAFE_INTEGER);
        this.currentInterval = Math.min(this.currentInterval, this.upperIntervalLimit ?? Number.MAX_SAFE_INTEGER);
    }
}

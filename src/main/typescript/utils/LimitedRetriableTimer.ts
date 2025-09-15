import GLib from '@girs/glib-2.0';

import { Logger } from './Logger';
import { lazy } from './utilities';

export type TimerTask = () => Promise<boolean>;

export class LimitedRetriableTimer {
    @lazy
    private static readonly LOGGER: Logger = new Logger('utils::LimitedRetriableTimer');

    private static readonly RETRY_INTERVALS: number[] = [60, 120, 300, 600, 900, 1800, 3600];

    public upperIntervalLimit?: number;

    public lowerIntervalLimit?: number;

    private _interval: number;

    private retries: number;

    private currentInterval: number;

    private timerHandle?: number;

    private readonly task: TimerTask;

    public constructor(task: TimerTask, interval: number) {
        this.task = task;
        this._interval = interval;

        this.retries = 0;
        this.currentInterval = this._interval;
        this.timerHandle = undefined;
    }

    public start(initialDelay: number = 0): void {
        LimitedRetriableTimer.LOGGER.debug(
            'Timer is started and will run every {0}s. Executing first run with an initial delay of {1}s',
            this._interval,
            initialDelay
        );

        // Reset the first timeout
        this.currentInterval = this._interval;

        // If no initial delay execute immediately
        if (initialDelay === 0) {
            this.runTaskAndSchedule();
        } else {
            // Otherwise schedule the first execution
            this.timerHandle = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, initialDelay, () => {
                this.runTaskAndSchedule();
                return false;
            });
        }
    }

    public stop(): void {
        if (this.timerHandle === undefined) {
            return;
        }

        LimitedRetriableTimer.LOGGER.debug('Timer is stopped');
        GLib.source_remove(this.timerHandle);
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
        if (this.timerHandle !== undefined) {
            this.restart();
        }
    }

    private runTaskAndSchedule(): void {
        this.task()
            .then((outcome: boolean) => {
                this.timerHandle = undefined;
                this.computeCurrentInterval(outcome);
                this.scheduleNextRun();
                LimitedRetriableTimer.LOGGER.debug(
                    'Last run {0}. Next run scheduled in {1}s (number of retries: {2})',
                    outcome ? 'succeed' : 'failed',
                    this.currentInterval,
                    this.retries
                );
            })
            .catch((err) => LimitedRetriableTimer.LOGGER.error('Unexpected error while executing timer task', err));
    }

    private scheduleNextRun(): void {
        if (this.timerHandle !== undefined) {
            GLib.source_remove(this.timerHandle);
        }

        this.timerHandle = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, this.currentInterval, () => {
            this.runTaskAndSchedule();
            return false;
        });
    }

    private computeCurrentInterval(successful: boolean): void {
        if (successful) {
            this.currentInterval = this._interval;
            this.retries = 0;
        } else {
            this.currentInterval = LimitedRetriableTimer.RETRY_INTERVALS[this.retries++] ?? 3600;
        }

        // Limit the interval according to the limits, if specified
        this.currentInterval = Math.max(this.currentInterval, this.lowerIntervalLimit ?? Number.MIN_SAFE_INTEGER);
        this.currentInterval = Math.min(this.currentInterval, this.upperIntervalLimit ?? Number.MAX_SAFE_INTEGER);
    }
}

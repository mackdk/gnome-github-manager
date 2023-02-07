import { PRIORITY_DEFAULT, timeout_add_seconds, source_remove } from '@gi-types/glib2';

import { Logger } from '@github-manager/utils/Logger';

export type TimerTask = () => Promise<boolean>;

export class LimitedRetriableTimer {

    private static readonly LOGGER: Logger = new Logger('utils::LimitedRetriableTimer');

    public upperIntervalLimit? : number;

    public lowerIntervalLimit? : number;

    public interval: number;

    public retryIntervals: number[];

    private retries: number;

    private currentInterval: number;

    private timerHandle?: number;

    private readonly task: TimerTask;

    public constructor(task: TimerTask, interval: number) {
        this.task = task;
        this.interval = interval;
        this.retryIntervals = [60, 120, 240, 480, 960, 1920, 3600];

        this.retries = 0;
        this.currentInterval = this.interval;
        this.timerHandle = undefined;
    }

    public start(initialDelay = 0) {
        LimitedRetriableTimer.LOGGER.debug('Timer is started. Executing first run with initial delay {0}s', initialDelay);

        // Reset the first timeout
        this.currentInterval = this.interval;

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

    public stop() {
        if (!this.timerHandle) {
            return;
        }

        LimitedRetriableTimer.LOGGER.debug('Timer is stopped');
        source_remove(this.timerHandle);
        this.timerHandle = undefined;
    }

    public restart(initialDelay = 0) {
        this.stop();
        this.start(initialDelay);
    }

    public get running() {
        return this.timerHandle !== undefined;
    }

    private runTaskAndSchedule() {
        this.task().then((outcome: boolean) => {
            this.scheduleNextRun();
            LimitedRetriableTimer.LOGGER.debug('Next fetch execution scheduled in {0} seconds', this.currentInterval);
            this.computeCurrentInterval(outcome);
        });
    }

    private scheduleNextRun() {
        this.stop();

        this.timerHandle = timeout_add_seconds(PRIORITY_DEFAULT, this.currentInterval, () => {
            this.runTaskAndSchedule();
            return false;
        });
    }

    private computeCurrentInterval(successful: boolean) {
        if (successful) {
            this.currentInterval = this.interval;
        } else {
            this.currentInterval = this.retryIntervals[this.retries] || 3600;
        }

        // Limit the interval according to the limits, if specified
        this.currentInterval = Math.max(this.currentInterval, this.lowerIntervalLimit || Number.MIN_SAFE_INTEGER);
        this.currentInterval = Math.min(this.currentInterval, this.upperIntervalLimit || Number.MAX_SAFE_INTEGER);
    }

}

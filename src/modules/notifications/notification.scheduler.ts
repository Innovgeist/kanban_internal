import logger from '../../utils/logger';
import { CardNotificationService } from './cardNotification.service';

let schedulerStarted = false;
let heartbeat: NodeJS.Timeout | null = null;
let lastFiveMinuteRunKey: string | null = null;
let lastHourlyRunKey: string | null = null;
let isFiveMinuteJobRunning = false;
let isHourlyJobRunning = false;

const getRunKey = (date: Date, mode: 'five-minute' | 'hourly') => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  if (mode === 'hourly') {
    return `${year}-${month}-${day}-${hour}`;
  }

  return `${year}-${month}-${day}-${hour}-${minute}`;
};

const runFiveMinuteNotifications = async () => {
  if (isFiveMinuteJobRunning) {
    logger.warn('Skipping 5-minute notification run because the previous run is still in progress');
    return;
  }

  isFiveMinuteJobRunning = true;
  try {
    await CardNotificationService.processPendingCardNotifications();
  } catch (error) {
    logger.error('Card notification scheduler failed', error);
  } finally {
    isFiveMinuteJobRunning = false;
  }
};

const runDueReminders = async () => {
  if (isHourlyJobRunning) {
    logger.warn('Skipping due reminder run because the previous run is still in progress');
    return;
  }

  isHourlyJobRunning = true;
  try {
    await CardNotificationService.processDueReminderNotifications();
  } catch (error) {
    logger.error('Due reminder scheduler failed', error);
  } finally {
    isHourlyJobRunning = false;
  }
};

const tick = async () => {
  const now = new Date();

  const fiveMinuteKey = getRunKey(now, 'five-minute');
  if (fiveMinuteKey !== lastFiveMinuteRunKey) {
    lastFiveMinuteRunKey = fiveMinuteKey;
    await runFiveMinuteNotifications();
  }

  if (now.getMinutes() === 0) {
    const hourlyKey = getRunKey(now, 'hourly');
    if (hourlyKey !== lastHourlyRunKey) {
      lastHourlyRunKey = hourlyKey;
      await runDueReminders();
    }
  }
};

export const startNotificationScheduler = () => {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;

  void tick();
  heartbeat = setInterval(() => {
    void tick();
  }, 60 * 1000);

  logger.info('Card notification scheduler started');
};

export const stopNotificationScheduler = () => {
  if (heartbeat) {
    clearInterval(heartbeat);
    heartbeat = null;
  }

  schedulerStarted = false;
};

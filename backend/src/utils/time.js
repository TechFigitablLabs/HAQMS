/**
 * utils/time.js
 *
 * Utilities for the Doctor.availableFrom / availableTo fields.
 * These are stored in the DB as Int (minutes since midnight).
 *
 *   540  → "09:00"
 *   1020 → "17:00"
 *   630  → "10:30"
 */

/**
 * Converts minutes-since-midnight to "HH:MM" string.
 * @param {number} minutes  e.g. 540
 * @returns {string}        e.g. "09:00"
 * @throws if input is out of the 0–1439 range
 */
const minsToTime = (minutes) => {
  if (typeof minutes !== 'number' || minutes < 0 || minutes > 1439) {
    throw new RangeError(`minsToTime: expected 0–1439, got ${minutes}`);
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Converts "HH:MM" string to minutes-since-midnight.
 * @param {string} timeStr  e.g. "09:00" or "9:00"
 * @returns {number}        e.g. 540
 * @throws if the string isn't a valid HH:MM time
 */
const timeToMins = (timeStr) => {
  if (typeof timeStr !== 'string') {
    throw new TypeError(`timeToMins: expected a string, got ${typeof timeStr}`);
  }
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    throw new TypeError(`timeToMins: invalid format "${timeStr}", expected "HH:MM"`);
  }
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h > 23 || m > 59) {
    throw new RangeError(`timeToMins: "${timeStr}" is not a valid time`);
  }
  return h * 60 + m;
};

/**
 * Validates that a "HH:MM" string is a well-formed time without converting it.
 * Useful in request validation before calling timeToMins.
 * @param {string} timeStr
 * @returns {boolean}
 */
const isValidTimeStr = (timeStr) => {
  if (typeof timeStr !== 'string') return false;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  return parseInt(match[1], 10) <= 23 && parseInt(match[2], 10) <= 59;
};

/**
 * Formats a Doctor row for API responses — converts the raw Int fields
 * back to "HH:MM" strings so the frontend never sees raw minutes.
 *
 * @param {object} doctor  Raw Prisma Doctor object
 * @returns {object}       Doctor with availableFrom/availableTo as "HH:MM"
 */
const formatDoctorTimes = (doctor) => {
  if (!doctor) return doctor;
  return {
    ...doctor,
    availableFrom: minsToTime(doctor.availableFrom),
    availableTo: minsToTime(doctor.availableTo),
  };
};

module.exports = { minsToTime, timeToMins, isValidTimeStr, formatDoctorTimes };
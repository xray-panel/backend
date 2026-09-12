import { z } from 'zod';

/**
 * Политика пароля администратора.
 *
 * Вынесена из RegisterCommand, чтобы создание второго администратора через
 * API панели не оказалось слабее, чем первичная регистрация суперадмина.
 * Держать две копии правил нельзя: они неизбежно разойдутся.
 */
export const ADMIN_PASSWORD_SCHEMA = z
    .string()
    .min(24, 'Password must contain at least 24 characters')
    .regex(
        /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{24,}$/,
        'Password must contain uppercase and lowercase letters and numbers, and be at least 24 characters long.',
    );

export const ADMIN_USERNAME_SCHEMA = z
    .string()
    .min(3, 'Username must contain at least 3 characters')
    .max(64, 'Username must contain at most 64 characters');

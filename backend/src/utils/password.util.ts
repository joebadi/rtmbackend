/**
 * Password Strength Utility
 * Validates and calculates password strength score
 */

export interface PasswordStrength {
    score: number; // 0-100
    level: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
    feedback: string[];
    isValid: boolean;
}

export interface PasswordValidationRules {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
}

// Default validation rules
const DEFAULT_RULES: PasswordValidationRules = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
};

/**
 * Calculate password strength score (0-100)
 */
export const calculatePasswordStrength = (
    password: string,
    rules: PasswordValidationRules = DEFAULT_RULES
): PasswordStrength => {
    const feedback: string[] = [];
    let score = 0;

    // Length scoring (0-40 points)
    if (password.length < rules.minLength) {
        feedback.push(`Password must be at least ${rules.minLength} characters`);
    } else if (password.length >= rules.minLength && password.length < 12) {
        score += 20;
    } else if (password.length >= 12 && password.length < 16) {
        score += 30;
    } else {
        score += 40;
    }

    // Uppercase letters (0-15 points)
    if (rules.requireUppercase) {
        if (/[A-Z]/.test(password)) {
            score += 15;
        } else {
            feedback.push('Add uppercase letters (A-Z)');
        }
    }

    // Lowercase letters (0-15 points)
    if (rules.requireLowercase) {
        if (/[a-z]/.test(password)) {
            score += 15;
        } else {
            feedback.push('Add lowercase letters (a-z)');
        }
    }

    // Numbers (0-15 points)
    if (rules.requireNumbers) {
        if (/[0-9]/.test(password)) {
            score += 15;
        } else {
            feedback.push('Add numbers (0-9)');
        }
    }

    // Special characters (0-15 points)
    if (rules.requireSpecialChars) {
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            score += 15;
        } else {
            feedback.push('Add special characters (!@#$%^&*)');
        }
    }

    // Bonus points for variety
    const hasUpperAndLower = /[A-Z]/.test(password) && /[a-z]/.test(password);
    const hasLettersAndNumbers = /[A-Za-z]/.test(password) && /[0-9]/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (hasUpperAndLower && hasLettersAndNumbers && hasSpecialChars) {
        score += 10; // Bonus for using all character types
    }

    // Penalty for common patterns
    if (/^[0-9]+$/.test(password)) {
        score -= 20;
        feedback.push('Avoid using only numbers');
    }
    if (/^[a-zA-Z]+$/.test(password)) {
        score -= 10;
        feedback.push('Mix letters with numbers and symbols');
    }
    if (/(.)\1{2,}/.test(password)) {
        score -= 10;
        feedback.push('Avoid repeating characters');
    }
    if (/^(123|abc|qwerty|password|admin)/i.test(password)) {
        score -= 30;
        feedback.push('Avoid common patterns');
    }

    // Ensure score is within 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine strength level
    let level: PasswordStrength['level'];
    if (score < 30) {
        level = 'weak';
    } else if (score < 50) {
        level = 'fair';
    } else if (score < 70) {
        level = 'good';
    } else if (score < 90) {
        level = 'strong';
    } else {
        level = 'very-strong';
    }

    // Check if password meets minimum requirements
    const isValid =
        password.length >= rules.minLength &&
        (!rules.requireUppercase || /[A-Z]/.test(password)) &&
        (!rules.requireLowercase || /[a-z]/.test(password)) &&
        (!rules.requireNumbers || /[0-9]/.test(password)) &&
        (!rules.requireSpecialChars || /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password));

    return {
        score,
        level,
        feedback: feedback.length > 0 ? feedback : ['Password meets requirements'],
        isValid,
    };
};

/**
 * Validate password against rules
 */
export const validatePassword = (
    password: string,
    rules: PasswordValidationRules = DEFAULT_RULES
): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (password.length < rules.minLength) {
        errors.push(`Password must be at least ${rules.minLength} characters long`);
    }

    if (rules.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (rules.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (rules.requireNumbers && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (rules.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * Check if password is in common password list
 * (Simplified version - in production, use a comprehensive list)
 */
const COMMON_PASSWORDS = [
    'password',
    '123456',
    '12345678',
    'qwerty',
    'abc123',
    'monkey',
    '1234567',
    'letmein',
    'trustno1',
    'dragon',
    'baseball',
    'iloveyou',
    'master',
    'sunshine',
    'ashley',
    'bailey',
    'passw0rd',
    'shadow',
    '123123',
    '654321',
    'superman',
    'qazwsx',
    'michael',
    'football',
];

export const isCommonPassword = (password: string): boolean => {
    return COMMON_PASSWORDS.includes(password.toLowerCase());
};

/**
 * Get password strength color for UI
 */
export const getPasswordStrengthColor = (level: PasswordStrength['level']): string => {
    switch (level) {
        case 'weak':
            return '#ef4444'; // red
        case 'fair':
            return '#f97316'; // orange
        case 'good':
            return '#eab308'; // yellow
        case 'strong':
            return '#22c55e'; // green
        case 'very-strong':
            return '#10b981'; // emerald
        default:
            return '#6b7280'; // gray
    }
};

export interface PasswordValidationResult {
    isValid: boolean;
    errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (!password || password.length < 8) {
        errors.push("Password must be at least 8 characters");
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    if (!hasUpper || !hasLower) {
        errors.push("Password must include upper and lower case letters");
    }

    const hasNumber = /[0-9]/.test(password);
    if (!hasNumber) {
        errors.push("Password must include at least one number");
    }

    // Special characters: non-alphanumeric
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (!hasSpecial) {
        errors.push("Password must include at least one special character");
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Password Strength Checker Utility
 * Evaluates password strength based on multiple criteria
 */

export const calculatePasswordStrength = (password) => {
  if (!password) {
    return {
      score: 0,
      strength: 'none',
      label: '',
      feedback: []
    };
  }

  let score = 0;
  const feedback = [];

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Use at least 8 characters');
  }

  if (password.length >= 12) {
    score += 1;
  }

  // Contains lowercase
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add lowercase letters');
  }

  // Contains uppercase
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add uppercase letters');
  }

  // Contains numbers
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add numbers');
  }

  // Contains special characters
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add special characters (!@#$%^&*)');
  }

  // Determine strength level
  let strength = 'weak';
  let label = 'Weak';
  
  if (score >= 5) {
    strength = 'strong';
    label = 'Strong';
  } else if (score >= 3) {
    strength = 'moderate';
    label = 'Moderate';
  }

  return {
    score,
    strength,
    label,
    feedback: feedback.slice(0, 2) // Limit to 2 suggestions
  };
};

/**
 * Get color class based on strength
 */
export const getStrengthColor = (strength) => {
  const colors = {
    weak: '#dc3545',      // Red
    moderate: '#ffc107',  // Yellow/Orange
    strong: '#28a745',    // Green
    none: '#e0e0e0'       // Gray
  };
  return colors[strength] || colors.none;
};

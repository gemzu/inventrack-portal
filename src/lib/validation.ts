export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required";
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return "Invalid email address";
  return null;
}

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value.trim()) return `${fieldName} is required`;
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";
  return null;
}

export function validateQuantity(qty: number): string | null {
  if (!Number.isFinite(qty)) return "Quantity must be a number";
  if (qty < 0) return "Quantity cannot be negative";
  if (!Number.isInteger(qty)) return "Quantity must be a whole number";
  return null;
}

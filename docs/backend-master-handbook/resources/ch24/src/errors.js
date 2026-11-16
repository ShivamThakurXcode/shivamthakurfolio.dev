export class DomainError extends Error { constructor(code, message) { super(message ?? code); this.code = code; } }

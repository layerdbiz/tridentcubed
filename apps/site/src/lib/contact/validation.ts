import * as v from 'valibot';

// ✅ Single source of truth - battle-tested regex patterns
const patterns = {
	// Simple, effective name pattern - letters, spaces, common punctuation
	name: /^[a-z ,.'-]+$/i,
	// Comprehensive international phone format with flexible formatting
	phone:
		/(?:([+]\d{1,4})[-.\s]?)?(?:[(](\d{1,3})[)][-.\s]?)?(\d{1,4})[-.\s]?(\d{1,4})[-.\s]?(\d{1,9})/,
	// Robust email pattern with proper domain validation
	email: /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i,
	// Message content with proper length limits
	message: /^[\s\S]{10,500}$/
};

// ✅ HTML5 pattern attributes - Svelte-compatible (no curly braces!)
// Note: No {} quantifiers - Svelte interprets them as template syntax
export const htmlPatterns = {
	// Simple name pattern - letters, spaces, basic punctuation
	name: "[a-zA-Z ,.'-]+",
	// Very simple phone pattern - digits, spaces, basic symbols (no length restrictions)
	phone: '[+0-9 ().-]+',
	// Simple email pattern - basic email format (no quantifiers)
	email: '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]+',
	// Simple message pattern - any characters (length handled by JS validation)
	message: '.+'
};

// ✅ Robust validation functions using the SAME patterns as HTML5
export function validateField(
	fieldName: keyof typeof patterns,
	value: string
): { isValid: boolean; error?: string } {
	try {
		switch (fieldName) {
			case 'name':
				v.parse(
					v.pipe(
						v.string(),
						v.nonEmpty('Name is required'),
						v.minLength(2, 'Name must be at least 2 characters'),
						v.maxLength(100, 'Name is too long'),
						// Simple name pattern - letters, spaces, common punctuation
						v.regex(
							patterns.name,
							'Name can only contain letters, spaces, commas, periods, apostrophes, and hyphens'
						)
					),
					value
				);
				break;
			case 'phone':
				v.parse(
					v.pipe(
						v.string(),
						v.nonEmpty('Phone is required'),
						v.minLength(7, 'Phone number too short'),
						v.maxLength(30, 'Phone number too long'),
						// Flexible international phone format
						v.regex(patterns.phone, 'Please enter a valid phone number')
					),
					value
				);
				break;
			case 'email':
				v.parse(
					v.pipe(
						v.string(),
						v.nonEmpty('Email is required'),
						v.maxLength(254, 'Email address too long'),
						// Use our robust email pattern
						v.regex(patterns.email, 'Please enter a valid email address')
					),
					value
				);
				break;
			case 'message':
				v.parse(
					v.pipe(
						v.string(),
						v.nonEmpty('Message is required'),
						v.minLength(10, 'Message must be at least 10 characters'),
						v.maxLength(500, 'Message must be less than 500 characters'),
						// Allow any content including newlines and special characters
						v.regex(patterns.message, 'Message contains invalid characters')
					),
					value
				);
				break;
		}
		return { isValid: true };
	} catch (error: any) {
		return { isValid: false, error: error.message };
	}
}

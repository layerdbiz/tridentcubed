type TextToken = {
	value: string;
	isAcronym: boolean;
};

function _collapseAcronyms(value: string) {
	return value.replace(/\b(?:[A-Za-z]\.){2,}[A-Za-z]?\.?/g, (match) => {
		return match.replace(/[^A-Za-z0-9]/g, "");
	});
}

function _hasContent(value: string) {
	return value.trim().length > 0;
}

function _splitTokens(value: string): TextToken[] {
	if (!_hasContent(value)) return [];

	const prepared = _collapseAcronyms(value.trim())
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
		.replace(/([A-Za-z])([0-9])/g, "$1 $2")
		.replace(/([0-9])([A-Za-z])/g, "$1 $2")
		.replace(/[’'`]/g, "")
		.replace(/[^A-Za-z0-9]+/g, " ")
		.trim();

	if (!prepared) return [];

	const tokens: TextToken[] = [];
	for (const part of prepared.split(/\s+/)) {
		if (!part) continue;
		tokens.push({
			value: part,
			isAcronym: /[A-Z]/.test(part) && part === part.toUpperCase() &&
				part.length > 1,
		});
	}

	return tokens;
}

function _normalizeSpacing(value: string) {
	return value.trim().replace(/\s+/g, " ");
}

function _capitalize(value: string) {
	if (!value) return "";
	return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function _joinLower(tokens: TextToken[], separator: string) {
	return tokens.map((token) => token.value.toLowerCase()).join(separator);
}

function _joinUpper(tokens: TextToken[], separator: string) {
	return tokens.map((token) => token.value.toUpperCase()).join(separator);
}

function _joinCapitalized(tokens: TextToken[], separator: string) {
	return tokens.map((token) => _capitalize(token.value)).join(separator);
}

export const text = {
	camel(value: string) {
		const tokens = _splitTokens(value);
		if (tokens.length === 0) return "";

		const [first, ...rest] = tokens;
		return first.value.toLowerCase() + _joinCapitalized(rest, "");
	},
	pascal(value: string) {
		return _joinCapitalized(_splitTokens(value), "");
	},
	kebab(value: string) {
		return _joinLower(_splitTokens(value), "-");
	},
	snake(value: string) {
		return _joinLower(_splitTokens(value), "_");
	},
	constant(value: string) {
		return _joinUpper(_splitTokens(value), "_");
	},
	train(value: string) {
		return _joinCapitalized(_splitTokens(value), "-");
	},
	ada(value: string) {
		return _joinCapitalized(_splitTokens(value), "_");
	},
	cobol(value: string) {
		return _joinUpper(_splitTokens(value), "-");
	},
	dot(value: string) {
		const tokens = _splitTokens(value);
		return tokens
			.map((
				token,
			) => (token.isAcronym
				? token.value.toUpperCase()
				: _capitalize(token.value))
			)
			.join(".");
	},
	path(value: string) {
		if (!_hasContent(value)) return "";
		return _normalizeSpacing(value).replace(/ /g, "/");
	},
	space(value: string) {
		if (!_hasContent(value)) return "";
		return _normalizeSpacing(value);
	},
	capital(value: string) {
		if (!_hasContent(value)) return "";

		const words: string[] = [];
		for (const part of _normalizeSpacing(value).split(" ")) {
			words.push(_capitalize(part));
		}

		return words.join(" ");
	},
	lower(value: string) {
		if (!_hasContent(value)) return "";
		return _normalizeSpacing(value).toLowerCase();
	},
	upper(value: string) {
		if (!_hasContent(value)) return "";
		return _normalizeSpacing(value).toUpperCase();
	},
};

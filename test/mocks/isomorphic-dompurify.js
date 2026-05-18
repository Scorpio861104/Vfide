function stripDangerousMarkup(input, config = {}) {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '');

  if (Array.isArray(config.ALLOWED_TAGS) && config.ALLOWED_TAGS.length === 0) {
    sanitized = sanitized.replace(/<[^>]+>/g, '');
  }

  return sanitized;
}

const domPurifyMock = {
  sanitize: stripDangerousMarkup,
};

module.exports = domPurifyMock;
module.exports.default = domPurifyMock;

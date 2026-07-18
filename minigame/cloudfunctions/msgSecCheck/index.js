const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const MAX_CONTENT_LENGTH = 64;

exports.main = async (event) => {
  const content = String(event?.content || '').trim();
  if (!content || content.length > MAX_CONTENT_LENGTH) {
    return { decision: 'risky', errCode: -1 };
  }

  try {
    const response = await cloud.openapi.security.msgSecCheck({ content });
    const errCode = Number(response?.errCode || 0);
    if (errCode === 87014 || response?.suggest === 'risky') {
      return { decision: 'risky', errCode };
    }
    if (errCode !== 0 || response?.suggest === 'review') {
      return { decision: 'review', errCode };
    }
    return { decision: 'pass', errCode: 0 };
  } catch (error) {
    return { decision: 'unavailable', errCode: Number(error?.errCode || -1) };
  }
};

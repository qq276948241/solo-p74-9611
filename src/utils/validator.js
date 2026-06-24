function AppError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function assert(condition, message, status = 400) {
  if (!condition) {
    throw AppError(message, status);
  }
}

function assertNotNull(value, entityName = '资源') {
  if (value === null || value === undefined) {
    throw AppError(`${entityName}不存在`, 404);
  }
  return value;
}

function assertExists(found, entityName = '资源') {
  if (!found) {
    throw AppError(`${entityName}不存在`, 404);
  }
  return found;
}

function assertOwner(userId, ownerId, message = '无权操作该资源') {
  if (userId !== ownerId) {
    throw AppError(message, 403);
  }
}

function assertIn(actual, allowed, message) {
  if (!Array.isArray(allowed)) allowed = [allowed];
  if (!allowed.includes(actual)) {
    throw AppError(message || `状态必须为 ${allowed.join('/')}`, 400);
  }
}

function assertRange(value, min, max, fieldName = '值') {
  if (value < min || value > max) {
    throw AppError(`${fieldName}必须在 ${min} 到 ${max} 之间`, 400);
  }
}

function assertNotEmpty(value, fieldName) {
  const empty =
    value === null || value === undefined ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0);
  if (empty) {
    throw AppError(`${fieldName || '该字段'}不能为空`, 400);
  }
}

function assertMinLength(arr, min, fieldName) {
  if (!Array.isArray(arr) || arr.length < min) {
    throw AppError(`${fieldName || '该字段'}至少需要 ${min} 项`, 400);
  }
}

function assertDateInRange(date, startDate, endDate, fieldName = '日期') {
  if (date < startDate || date > endDate) {
    throw AppError(`${fieldName}必须在 ${startDate} 至 ${endDate} 之间`, 400);
  }
}

module.exports = {
  AppError, assert, assertNotNull, assertExists,
  assertOwner, assertIn, assertRange, assertNotEmpty,
  assertMinLength, assertDateInRange
};

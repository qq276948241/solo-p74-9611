function buildWhereClause(conditions) {
  const clauses = [];
  const params = [];
  for (const cond of conditions) {
    if (cond.value === undefined || cond.value === null || cond.value === '') continue;
    clauses.push(cond.clause);
    if (Array.isArray(cond.value)) {
      params.push(...cond.value);
    } else {
      params.push(cond.value);
    }
  }
  const sql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  return { sql, params };
}

function buildSetClause(fields, allowedFields) {
  const clauses = [];
  const params = [];
  for (const field of allowedFields) {
    if (fields[field] === undefined) continue;
    clauses.push(`${field} = ?`);
    params.push(fields[field]);
  }
  const sql = clauses.length > 0 ? `SET ${clauses.join(', ')}` : '';
  return { sql, params };
}

function appendOrderAndLimit(sql, params, orderBy, page, pageSize) {
  let fullSql = sql;
  if (orderBy) fullSql += ` ORDER BY ${orderBy}`;
  if (page && pageSize) {
    fullSql += ' LIMIT ? OFFSET ?';
    const newParams = [...params, pageSize, (page - 1) * pageSize];
    return { sql: fullSql, params: newParams };
  }
  return { sql: fullSql, params };
}

module.exports = { buildWhereClause, buildSetClause, appendOrderAndLimit };

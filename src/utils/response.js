function success(data = null, message = 'success') {
  return { code: 0, message, data };
}

function paginate(list, total, page, pageSize) {
  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}

module.exports = { success, paginate };

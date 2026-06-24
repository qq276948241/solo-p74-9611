function errorHandler(err, req, res, _next) {
  console.error(`[Error] ${new Date().toISOString()} ${req.method} ${req.url}:`, err.message);

  if (err.name === 'MulterError') {
    return res.status(400).json({ code: 400, message: `文件上传失败: ${err.message}` });
  }

  const status = err.status || 500;
  const message = err.message || '服务器内部错误';

  res.status(status).json({ code: status, message });
}

module.exports = errorHandler;

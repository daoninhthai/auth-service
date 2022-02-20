/**
 * Pagination middleware
 * Parses page and limit from query parameters
 * Attaches pagination info to req.pagination
 */
const pagination = (defaultLimit = 20, maxLimit = 100) => {
  return (req, res, next) => {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || defaultLimit;

    // Ensure positive values
    if (page < 1) page = 1;
    if (limit < 1) limit = 1;
    if (limit > maxLimit) limit = maxLimit;

    const offset = (page - 1) * limit;

    req.pagination = {
      page,
      limit,
      offset,
    };

    next();
  };
};

/**
 * Build pagination response metadata
 * @param {number} total - Total number of records
 * @param {number} page - Current page
 * @param {number} limit - Records per page
 * @returns {Object} Pagination metadata
 */
const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

module.exports = {
  pagination,
  buildPaginationMeta,
};

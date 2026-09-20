// src/utils/fetchAllPages.js
// Generic page-loop for the API's paginated list endpoints (customer requests,
// payments, users, installer queue — all return `{ data: [...], pagination:
// { hasNext } }` and accept `page` + `limit` (max 100)). Callers that need
// "the whole dataset" (for client-side search/filter/bucketing) use this
// instead of a single call, which would silently stop at the server's
// default page size (10 for most of these endpoints, 20 for payments).
//
// Usage: fetchAllPages((params) => jedApi.getPayments(params), { startDate })
const PAGE_LIMIT = 100; // the API's documented maximum
const MAX_PAGES = 20; // safety cap (~2000 records) against an unbounded loop on a very large dataset

export async function fetchAllPages(fetchPage, params = {}) {
  const all = [];
  let page = 1;
  while (page <= MAX_PAGES) {
    const resp = await fetchPage({ ...params, page, limit: PAGE_LIMIT });
    const data = Array.isArray(resp?.data)
      ? resp.data
      : Array.isArray(resp?.data?.users)
        ? resp.data.users
        : Array.isArray(resp)
          ? resp
          : [];
    if (data.length === 0) break;
    all.push(...data);
    if (!resp?.pagination?.hasNext) break;
    page += 1;
  }
  return all;
}

export default fetchAllPages;

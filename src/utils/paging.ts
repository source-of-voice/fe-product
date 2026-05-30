import type { PageResponse, SliceResponse } from '../types/domain';

export const emptySlice = <T,>(): SliceResponse<T> => ({
  content: [],
  page: 0,
  size: 20,
  first: true,
  last: true,
  hasNext: false,
  numberOfElements: 0
});

export const emptyPage = <T,>(): PageResponse<T> => ({
  content: [],
  number: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
  numberOfElements: 0,
  empty: true
});

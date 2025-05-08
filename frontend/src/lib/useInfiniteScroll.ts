import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number; // Distance from bottom to trigger loading (in pixels)
  initialPage?: number; // Starting page number
  pageSize?: number; // Number of items per page
  enabled?: boolean; // Whether infinite scrolling is enabled
}

/**
 * Custom hook for implementing infinite scrolling
 * @param loadMore Function to call when more items need to be loaded
 * @param options Configuration options
 * @returns Object containing loading state, page info, and reset function
 */
export function useInfiniteScroll<T>(
  loadMore: (page: number, pageSize: number) => Promise<T[]>,
  options: UseInfiniteScrollOptions = {}
) {
  const {
    threshold = 200,
    initialPage = 1,
    pageSize = 10,
    enabled = true
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);

  // Reset function to clear items and start from initial page
  const reset = useCallback(() => {
    setItems([]);
    setPage(initialPage);
    setHasMore(true);
    setError(null);
  }, [initialPage]);

  // Function to fetch more items
  const fetchItems = useCallback(async () => {
    if (!enabled || loading || !hasMore) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const newItems = await loadMore(page, pageSize);
      
      setItems(prevItems => {
        // If we're on the first page, replace items
        if (page === initialPage) {
          return newItems;
        }
        // Otherwise append new items
        return [...prevItems, ...newItems];
      });
      
      // If we got fewer items than the page size, we've reached the end
      setHasMore(newItems.length === pageSize);
      
      // Increment page number for next fetch
      if (newItems.length > 0) {
        setPage(prevPage => prevPage + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setLoading(false);
    }
  }, [loadMore, page, pageSize, loading, hasMore, enabled, initialPage]);

  // Set up intersection observer to detect when user scrolls to bottom
  useEffect(() => {
    if (!enabled) return;
    
    const handleObserver = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && !loading) {
        fetchItems();
      }
    };

    // Disconnect previous observer if it exists
    if (observer.current) {
      observer.current.disconnect();
    }

    // Create new observer
    observer.current = new IntersectionObserver(handleObserver, {
      rootMargin: `0px 0px ${threshold}px 0px`,
    });

    // Observe loading element if it exists
    if (loadingRef.current) {
      observer.current.observe(loadingRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [fetchItems, loading, threshold, enabled]);

  // Initial load
  useEffect(() => {
    if (enabled && items.length === 0 && hasMore) {
      fetchItems();
    }
  }, [enabled, fetchItems, items.length, hasMore]);

  return {
    items,
    loading,
    hasMore,
    error,
    loadingRef,
    reset,
    page,
    setItems
  };
}
"""
Caching module for LLM responses and parsed questions.
Implements in-memory caching with TTL and size limits.
"""

import time
import hashlib
import json
from typing import Any, Optional, Dict, Tuple
from collections import OrderedDict
from threading import Lock

from .logger import get_logger
from .constants import CACHE_TTL, CACHE_MAX_SIZE

# Initialize logger
logger = get_logger("cache")


class LRUCache:
    """
    Thread-safe LRU (Least Recently Used) cache with TTL support.
    """
    
    def __init__(self, max_size: int = CACHE_MAX_SIZE, ttl: int = CACHE_TTL):
        """
        Initialize cache.
        
        Args:
            max_size: Maximum number of items to cache
            ttl: Time-to-live for cache entries in seconds
        """
        self.max_size = max_size
        self.ttl = ttl
        self.cache: OrderedDict[str, Tuple[Any, float]] = OrderedDict()
        self.lock = Lock()
        self.hits = 0
        self.misses = 0
        
        logger.info(f"Cache initialized: max_size={max_size}, ttl={ttl}s")
    
    def _generate_key(self, *args, **kwargs) -> str:
        """
        Generate cache key from arguments.
        
        Args:
            *args: Positional arguments
            **kwargs: Keyword arguments
            
        Returns:
            Cache key string
        """
        # Create a deterministic string from arguments
        key_data = {
            "args": args,
            "kwargs": sorted(kwargs.items())
        }
        key_string = json.dumps(key_data, sort_keys=True)
        
        # Hash for shorter keys
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found/expired
        """
        with self.lock:
            if key not in self.cache:
                self.misses += 1
                logger.debug(f"Cache miss: {key}")
                return None
            
            value, timestamp = self.cache[key]
            
            # Check if expired
            if time.time() - timestamp > self.ttl:
                del self.cache[key]
                self.misses += 1
                logger.debug(f"Cache expired: {key}")
                return None
            
            # Move to end (most recently used)
            self.cache.move_to_end(key)
            self.hits += 1
            logger.debug(f"Cache hit: {key}")
            return value
    
    def set(self, key: str, value: Any) -> None:
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
        """
        with self.lock:
            # Remove oldest if at capacity
            if len(self.cache) >= self.max_size and key not in self.cache:
                oldest_key = next(iter(self.cache))
                del self.cache[oldest_key]
                logger.debug(f"Cache evicted (LRU): {oldest_key}")
            
            # Add/update entry
            self.cache[key] = (value, time.time())
            self.cache.move_to_end(key)
            logger.debug(f"Cache set: {key}")
    
    def clear(self) -> None:
        """Clear all cache entries."""
        with self.lock:
            self.cache.clear()
            self.hits = 0
            self.misses = 0
            logger.info("Cache cleared")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with cache stats
        """
        with self.lock:
            total_requests = self.hits + self.misses
            hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0
            
            return {
                "size": len(self.cache),
                "max_size": self.max_size,
                "hits": self.hits,
                "misses": self.misses,
                "hit_rate": round(hit_rate, 2),
                "total_requests": total_requests
            }
    
    def remove_expired(self) -> int:
        """
        Remove all expired entries.
        
        Returns:
            Number of entries removed
        """
        with self.lock:
            current_time = time.time()
            expired_keys = [
                key for key, (_, timestamp) in self.cache.items()
                if current_time - timestamp > self.ttl
            ]
            
            for key in expired_keys:
                del self.cache[key]
            
            if expired_keys:
                logger.info(f"Removed {len(expired_keys)} expired cache entries")
            
            return len(expired_keys)


# Global cache instances
_llm_cache: Optional[LRUCache] = None
_question_cache: Optional[LRUCache] = None


def get_llm_cache() -> LRUCache:
    """Get or create global LLM response cache."""
    global _llm_cache
    if _llm_cache is None:
        _llm_cache = LRUCache(max_size=100, ttl=3600)  # 1 hour TTL
    return _llm_cache


def get_question_cache() -> LRUCache:
    """Get or create global question cache."""
    global _question_cache
    if _question_cache is None:
        _question_cache = LRUCache(max_size=500, ttl=7200)  # 2 hour TTL
    return _question_cache


def cache_llm_response(func):
    """
    Decorator to cache LLM responses.
    
    Usage:
        @cache_llm_response
        def call_llm(prompt):
            ...
    """
    def wrapper(prompt: str, *args, **kwargs):
        cache = get_llm_cache()
        key = cache._generate_key(prompt)
        
        # Try to get from cache
        cached_result = cache.get(key)
        if cached_result is not None:
            logger.info("Returning cached LLM response")
            return cached_result
        
        # Call function and cache result
        result = func(prompt, *args, **kwargs)
        cache.set(key, result)
        
        return result
    
    return wrapper


def cache_questions(func):
    """
    Decorator to cache generated questions.
    
    Usage:
        @cache_questions
        def generate_questions(exam, subject_data):
            ...
    """
    def wrapper(exam: str, subject_data: dict, *args, **kwargs):
        cache = get_question_cache()
        key = cache._generate_key(exam, subject_data)
        
        # Try to get from cache
        cached_result = cache.get(key)
        if cached_result is not None:
            logger.info("Returning cached questions")
            return cached_result
        
        # Call function and cache result
        result = func(exam, subject_data, *args, **kwargs)
        cache.set(key, result)
        
        return result
    
    return wrapper


def clear_all_caches() -> None:
    """Clear all caches."""
    if _llm_cache:
        _llm_cache.clear()
    if _question_cache:
        _question_cache.clear()
    logger.info("All caches cleared")


def get_cache_stats() -> Dict[str, Any]:
    """
    Get statistics for all caches.
    
    Returns:
        Dictionary with cache statistics
    """
    stats = {}
    
    if _llm_cache:
        stats["llm_cache"] = _llm_cache.get_stats()
    
    if _question_cache:
        stats["question_cache"] = _question_cache.get_stats()
    
    return stats

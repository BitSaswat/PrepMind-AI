"""
Performance monitoring and optimization utilities.
Tracks API calls, generation times, and system metrics.
"""

import time
import functools
from typing import Dict, Any, Callable, List
from collections import defaultdict
from threading import Lock

from .logger import get_logger

# Initialize logger
logger = get_logger("performance")


class PerformanceMonitor:
    """
    Monitor and track performance metrics.
    """
    
    def __init__(self):
        """Initialize performance monitor."""
        self.metrics: Dict[str, List[float]] = defaultdict(list)
        self.counters: Dict[str, int] = defaultdict(int)
        self.lock = Lock()
        
        logger.info("Performance monitor initialized")
    
    def record_time(self, operation: str, duration: float) -> None:
        """
        Record operation duration.
        
        Args:
            operation: Operation name
            duration: Duration in seconds
        """
        with self.lock:
            self.metrics[operation].append(duration)
            logger.debug(f"Recorded {operation}: {duration:.3f}s")
    
    def increment_counter(self, counter: str, amount: int = 1) -> None:
        """
        Increment a counter.
        
        Args:
            counter: Counter name
            amount: Amount to increment
        """
        with self.lock:
            self.counters[counter] += amount
    
    def get_stats(self, operation: str = None) -> Dict[str, Any]:
        """
        Get performance statistics.
        
        Args:
            operation: Optional operation name to get stats for
            
        Returns:
            Dictionary with performance stats
        """
        with self.lock:
            if operation:
                if operation not in self.metrics:
                    return {}
                
                times = self.metrics[operation]
                return {
                    "operation": operation,
                    "count": len(times),
                    "total_time": sum(times),
                    "avg_time": sum(times) / len(times) if times else 0,
                    "min_time": min(times) if times else 0,
                    "max_time": max(times) if times else 0
                }
            
            # Return all stats
            stats = {}
            for op, times in self.metrics.items():
                stats[op] = {
                    "count": len(times),
                    "total_time": round(sum(times), 3),
                    "avg_time": round(sum(times) / len(times), 3) if times else 0,
                    "min_time": round(min(times), 3) if times else 0,
                    "max_time": round(max(times), 3) if times else 0
                }
            
            stats["counters"] = dict(self.counters)
            return stats
    
    def reset(self) -> None:
        """Reset all metrics."""
        with self.lock:
            self.metrics.clear()
            self.counters.clear()
            logger.info("Performance metrics reset")


# Global performance monitor
_monitor: PerformanceMonitor = None


def get_monitor() -> PerformanceMonitor:
    """Get or create global performance monitor."""
    global _monitor
    if _monitor is None:
        _monitor = PerformanceMonitor()
    return _monitor


def measure_time(operation_name: str = None):
    """
    Decorator to measure function execution time.
    
    Usage:
        @measure_time("question_generation")
        def generate_questions(...):
            ...
    """
    def decorator(func: Callable) -> Callable:
        op_name = operation_name or func.__name__
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            monitor = get_monitor()
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                duration = time.time() - start_time
                monitor.record_time(op_name, duration)
                logger.info(f"{op_name} completed in {duration:.3f}s")
        
        return wrapper
    return decorator


def count_calls(counter_name: str = None):
    """
    Decorator to count function calls.
    
    Usage:
        @count_calls("api_calls")
        def call_api(...):
            ...
    """
    def decorator(func: Callable) -> Callable:
        cnt_name = counter_name or f"{func.__name__}_calls"
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            monitor = get_monitor()
            monitor.increment_counter(cnt_name)
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


def get_performance_report() -> str:
    """
    Get formatted performance report.
    
    Returns:
        Formatted performance report string
    """
    monitor = get_monitor()
    stats = monitor.get_stats()
    
    report = ["=" * 60]
    report.append("PERFORMANCE REPORT")
    report.append("=" * 60)
    
    # Operation timings
    if any(k != "counters" for k in stats.keys()):
        report.append("\nOperation Timings:")
        report.append("-" * 60)
        
        for op, metrics in stats.items():
            if op == "counters":
                continue
            
            report.append(f"\n{op}:")
            report.append(f"  Count: {metrics['count']}")
            report.append(f"  Total Time: {metrics['total_time']:.3f}s")
            report.append(f"  Avg Time: {metrics['avg_time']:.3f}s")
            report.append(f"  Min Time: {metrics['min_time']:.3f}s")
            report.append(f"  Max Time: {metrics['max_time']:.3f}s")
    
    # Counters
    if "counters" in stats and stats["counters"]:
        report.append("\nCounters:")
        report.append("-" * 60)
        
        for counter, value in stats["counters"].items():
            report.append(f"  {counter}: {value}")
    
    report.append("\n" + "=" * 60)
    
    return "\n".join(report)


def log_performance_summary() -> None:
    """Log performance summary to logger."""
    report = get_performance_report()
    logger.info(f"\n{report}")


# Convenience functions
def start_timer() -> float:
    """Start a timer and return start time."""
    return time.time()


def end_timer(start_time: float, operation: str = None) -> float:
    """
    End timer and optionally record duration.
    
    Args:
        start_time: Start time from start_timer()
        operation: Optional operation name to record
        
    Returns:
        Duration in seconds
    """
    duration = time.time() - start_time
    
    if operation:
        monitor = get_monitor()
        monitor.record_time(operation, duration)
    
    return duration

import time
from collections import defaultdict
from fastapi import Request, HTTPException, status
from typing import Dict
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RateLimiter:
    def __init__(self, max_requests: int = 100, window_size: int = 3600):  # 100 requests per hour
        self.max_requests = max_requests
        self.window_size = window_size
        self.requests: Dict[str, list] = defaultdict(list)

    def is_allowed(self, identifier: str) -> bool:
        now = time.time()

        # Clean old requests outside the window
        valid_requests = [
            req_time for req_time in self.requests[identifier]
            if now - req_time < self.window_size
        ]

        if not valid_requests:
            if identifier in self.requests:
                del self.requests[identifier]
        else:
            self.requests[identifier] = valid_requests

        # Check if limit exceeded
        if len(self.requests[identifier]) >= self.max_requests:
            return False

        # Add current request
        self.requests[identifier].append(now)
        return True


# Global rate limiter instance
rate_limiter = RateLimiter(max_requests=3600, window_size=3600)  # 3600 requests per hour per IP (standard safe limit)


def rate_limit_middleware(request: Request):
    client_ip = request.client.host
    if not rate_limiter.is_allowed(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )